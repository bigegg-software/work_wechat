
const sha1 = require('sha1')
const CronJob = require('cron').CronJob;
const fetch = require('node-fetch')
var WXBizMsgCrypt = require('wechat-crypto');
var Util = require('./util')


class Store {
    constructor() {

    }
    set(key, value, cb) {
        this[key] = value
        cb()
    }
    get(key, cb) {
        cb(this[key])
    }
}

class QYWX {

    constructor(opt) {
        this.agentid = opt.agentid;
        this.wechatAppId = opt.wechatAppId;
        this.redirectUrl = opt.redirectUrl;
        this.wechatSecrect = opt.wechatSecrect
        this.isStore = opt.isStore;
        this.wechatMessageToken = opt.wechatMessageToken, 
        this.encodingAESKey = opt.encodingAESKey

        this.key = opt.key || 'QYWX_TOKEN_REDIS';
        if (opt.redis) {
            this.store = opt.redis
        } else {
            this.store = new Store()
        }
        this._init()


    }

    _init() {
        this.getAccessToken()
        let job = new CronJob('1 */10 * * * *', () => {
            this.getAccessToken()
        }, null, true, 'America/Los_Angeles');
        job.start()
    }

    _saveToken(value) {
        return new Promise(resolve => {
            this.store.set(this.key, value, () => {
                resolve()
            });
        })
    }
    _getToken() {
        return new Promise(resolve => {
            this.store.get(this.key, (v) => {
                resolve(v)
            });
        })
    }
    loadString(stream) {
        return new Promise((reslove, reject) => {
          var buffers = [];
          stream.on('data', function (trunk) {
            buffers.push(trunk)
          });
          stream.on('end', function () {
              reslove(Buffer.concat(buffers))
            // callback(null, Buffer.concat(buffers));
          });
          stream.once('error', reslove);  
        })
      }

    sign(ticket, noncestr, timestamp, url) {
        let info = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`
        return sha1(info)
    }
    getAuthUrl(state = 'state', scope = 'snsapi_userinfo') {
        return "https://open.weixin.qq.com/connect/oauth2/authorize?appid=" + this.wechatAppId +
            "&redirect_uri=" + this.redirectUrl +
            "&response_type=code&scope=" + scope +
            "&agentid=" + this.agentid +
            "&state=" + state + "#wechat_redirect"
    }
    async getUserId(code, token) {
        token = token || await this._getToken()
        let v = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${token}&code=${code}`)
        let result = await v.json();
        return result
    }
    async getUserInfo(userid, token) {
        token = token || await this._getToken()
        let userInfo = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${token}&userid=${userid}`)
        userInfo = await userInfo.json();
        return userInfo
    }
    async getAccessToken() {
        let data = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.wechatAppId}&corpsecret=${this.wechatSecrect}`)
        let result = await data.json()
        console.log(result)
        await this._saveToken(result.access_token)

        return result
    }
    async getAgentTicket(token) {
        token = token || await this._getToken()
        let data = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/ticket/get?access_token=${token}&type=agent_config`)
        let result = await data.json()
        return result
    }
    async getTicket(token) {
        token = token || await this._getToken()
        let data = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${token}`)
        let result = await data.json()
        return result
    }
    async checkMessage(info) {


        var sVerifyMsgSig = info.msg_signature;
        var sVerifyTimeStamp = info.timestamp;
        var sVerifyNonce = info.nonce;
        var sVerifyEchoStr = decodeURIComponent(info.echostr);
        var cryptor = new WXBizMsgCrypt(this.wechatMessageToken, this.encodingAESKey, this.agentid); //todo

        var MsgSig = cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, sVerifyEchoStr);
        if (sVerifyMsgSig == MsgSig) {
            let sEchoStr = cryptor.decrypt(sVerifyEchoStr).message;
            return sEchoStr
        } else {
            return "-40001_invaild MsgSig"
        }
    }

    async handleMessage(req) {
        let info = req.query
        var sVerifyMsgSig = info.msg_signature;
        var sVerifyTimeStamp = info.timestamp;
        var sVerifyNonce = info.nonce;
        var sVerifyEchoStr = decodeURIComponent(info.echostr);

        var cryptor = new WXBizMsgCrypt(this.wechatMessageToken, this.encodingAESKey, this.agentid); //todo

        let buffInfo = await this.loadString(req)
        var xml = buffInfo.toString('utf-8');
        var result = await Util.xmlParse(xml)
        xml = Util.formatMessage(result.xml);
        var encryptMessage = xml.Encrypt;
        if (sVerifyMsgSig != cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, encryptMessage)) {
            //console.log("fail");
            return '-40005_Invalid corpId'

        }

        var decrypted = cryptor.decrypt(encryptMessage);
        var messageWrapXml = decrypted.message;
        if (messageWrapXml === '') {
            return '-40005_Invalid corpId'
        }
        result = await Util.xmlParse(messageWrapXml)

        if (!result) {
            return '-40005_Invalid corpId'
        }
        var message = Util.formatMessage(result.xml);

        
        return message

        
    }
    async getApprovalDetail(sp_no, token){

        token = token || await this._getToken()
        let approvalDetail = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/oa/getapprovaldetail?access_token=${token}`,{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "sp_no" : sp_no
            })
        })
        approvalDetail = await approvalDetail.json();
        return approvalDetail
    }
    async getDepartment(id){
        token = token || await this._getToken()
        let url = `https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${token}`;
        if(id != undefined){
            url +=  `&id=${id}`
        }
        let approvalDetail = await fetch(url)
        approvalDetail = await approvalDetail.json();
        return approvalDetail
    }


}
module.exports = QYWX
