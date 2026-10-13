const {Engine,Request,RequestType,CosmeticOption}=require('../lib/generated/adguard.cjs');
const engine=Engine.createSync({filters:[{id:1,content:'||doubleclick.net^\nexample.org##.ad-banner\nexample.org#%#//scriptlet("set-constant", "ads", "false")'}]});
const req=new Request('https://example.org','https://example.org',RequestType.Document);
const result=engine.getCosmeticResult(req,CosmeticOption.CosmeticOptionAll);
console.dir(result,{depth:2});for(const rule of result.JS.getRules())console.log('script',rule.getScript()?.slice(0,160));
