### work-wechat
---
安装

```
    npm install @bigegg/work-wechat
```

使用

```
    const QYWX = require('@bigegg/work-wechat')

    const qywx = new QYWX({
        agentid: process.env.agentid,
        wechatAppId: process.env.wechatAppId,
        wechatSecrect: process.env.wechatSecrect,
        redirectUrl: process.env.redirectUrl,
    })

```

方法
* getAuthUrl
* getUserId 
* getUserInfo
* getTicket
* getAgentTicket
* sign




