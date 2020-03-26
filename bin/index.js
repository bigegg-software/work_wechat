
const sha1 = require('sha1')
const CronJob = require('cron').CronJob;
const fetch = require('node-fetch')

class Store{
    constructor(){

    }
    set(key, value, cb){
        this[key] =  value
        cb()
    }
    get(key, cb){
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
        this.key = opt.key || 'QYWX_TOKEN_REDIS';
        if(opt.redis){
            this.store = opt.redis
        }else{
            this.store = new Store()
        }
        this._init()

        
    }

    _init(){
        this.getAccessToken()
       let job =  new CronJob('1 */10 * * * *', () => {
            this.getAccessToken()
        }, null, true, 'America/Los_Angeles');
        job.start()
    }
    
    _saveToken(value){
        return new Promise(resolve =>{
            this.store.set(this.key, value, ()=>{
                resolve()
            });
        })
    }
    _getToken(){
        return new Promise(resolve =>{
            this.store.get(this.key, (v) =>{
                resolve(v)
            });
        })
    }
    
    sign(ticket, noncestr, timestamp, url){
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
}
module.exports = QYWX
