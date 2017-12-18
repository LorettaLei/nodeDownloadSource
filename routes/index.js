var express = require('express');
var router = express.Router();
var logger = require('../logger').logger;
var request = require('request');
var fs = require('fs');
// var child_process = require('child_process');
var path = require('path');
var cheerio = require("cheerio");
var getPixels = require("get-pixels");
var async = require('async');
var http = require('http');
var buffer = require('buffer');
var url = require('url');
var moment = require('moment');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index');
});


//getSource获取网页资源接口
router.post('/getSource', function(req, res, next) {
    var reqBody = req.body;
	var getUrl = req.body.url;
    var indexUrl = path.join(__dirname, '../download/source/index.html');

    var cssPath = path.join(__dirname,`../download/source/css/`);//样式文件保存路径
    var jsPath = path.join(__dirname, `../download/source/js/`);//js文件保存路径
    var imgPath = path.join(__dirname,`../download/source/img/`);//图片保存路径


	request({
        method:'GET',
        url:getUrl
    }, function (error, response, body) {
        if(error){
            logger.error(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][请求url出错:::${error}]`);
            res.json({
                code: 500,
                msg:'请求失败了！'
            })
        }else {
            //保存index.html文件
            fs.writeFile(indexUrl, body, 'utf-8', function (err) {
                if(err){
                    logger.error(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][html文件写入失败:::${err}]`);
                    return res.json({
                        code: 500,
                        msg: 'html文件下载失败'
                    })
                }
                logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][html文件写入成功]`);
            });

            const $ = cheerio.load(body);


            //下载文件
            var Urls = [];
            var filename = '';
            // console.log($("img"));
            // $('link[type="text/css"]').forEach((item, index) => {Urls.push(item.attr('href'))});
            for(var j = 0;j < $('script[src]').length; j++){
                Urls.push($('script[src]').eq(j).attr('src'));
            }
            for(var k = 0;k < $('link[type="text/css"]').length;k++){
                Urls.push($('link[type="text/css"]').eq(k).attr('href'));
            }
            logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][js和css文件检索成功:::${JSON.stringify(Urls)}]`);
            var imgUrls = [];
            for(var i = 0;i < $('img').length; i++){
                imgUrls.push($('img').eq(i).attr('src'));
            }
            logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][img文件检索成功:::${JSON.stringify(imgUrls)}]`);
            // console.log(JSON.stringify(Urls));
            // Urls.push($('script[src]').attr('src'));
            // Urls.push($('img').attr('src'));
            try {
                Urls.forEach((item) => {
                    request({
                        method: 'GET',
                        url: getSourceUrl(getUrl, item)
                    }, function (err, res1, body1) {
                        if(err){
                            logger.error(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][error:${err}]`);
                        }
                        filename = getSourceUrl(getUrl, item).split('/').slice(-1);
                        //下载js文件
                        if(filename.toString().substr(-3,3) === '.js'){
                            fs.writeFile(jsPath + filename.toString(), body1, 'utf-8', function (err1) {
                                if (err1){
                                    return res.json({
                                        code: 500,
                                        msg: 'js文件写入出错'
                                    })
                                }else {
                                    logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][js文件保存成功:::${filename.toString()}]`);
                                }
                            })
                        }else if(filename.toString().substr(-4,4) === '.css') {//下载样式文件
                            fs.writeFile(cssPath + filename.toString(), body1, 'utf-8', function (err1) {
                                if (err1){
                                    return res.json({
                                        code: 500,
                                        msg: 'css文件写入出错'
                                    })
                                }else {logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][css文件保存成功:::${filename.toString()}]`);
                                }
                            })
                        }
                    })
                });
            }catch (e){
                logger.error(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][Urls数组遍历异常：${e}]`);
            }
            try {
                imgUrls.forEach((item) => {
                    filename = getSourceUrl(getUrl, item).split('/').slice(-1);
                    if (filename.toString().substr(-4,4) === '.jpg' || filename.toString().substr(-4,4) === '.png' || filename.toString().substr(-4,4) === '.gif'){
                        request(getSourceUrl(getUrl, item)).pipe(fs.createWriteStream(imgPath + filename.toString()));
                        logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][img文件保存成功:::${filename.toString()}]`);
                    }else if(filename.toString().substr(-4,4) === '.svg') {
                        request({
                            method: 'GET',
                            url:getSourceUrl(getUrl, item)
                        }, function (err2, res2, body2) {
                            if(err2){
                                return res.json({
                                    code: 500,
                                    msg: 'svg请求下载出错'
                                })
                            }
                            fs.writeFile(imgPath + filename.toString(), body2, 'utf-8', function (err3) {
                                if (err3){
                                    return res.json({
                                        code: 500,
                                        msg: 'svg文件写入出错'
                                    })
                                }else {
                                    logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][svg文件保存成功]`);
                                }
                            })
                        });
                    }
                });
                logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][图片保存成功]`);
            } catch (e){
                logger.info(`[node getSource][getSource获取资源接口][接口:::/getSource][传入参数:::${JSON.stringify(reqBody)}][imgUrls数组遍历异常：${e}]`);
            }
            return res.json({
                code: 500,
                msg: '资源下载完毕'
            })
        }
    });


});

//测试getSourceUrl接口
router.post('/test', function (req, res, next) {
    var aa = 'http://www.longsung.com/css/style.css?dsadw=ewewe';
    var bb = '/css/style.css';
    var cc = 'css/style.css';
    var dd = '/static/css/style.css?time=201709889';
    var ur = 'http://www.longsung.com/';
    console.log(getSourceUrl(ur,aa));
    console.log(getSourceUrl(ur,bb));
    console.log(getSourceUrl(ur,cc));
    console.log(getSourceUrl(ur,dd));
})

//获取文件url地址
function getSourceUrl(webUrl,labelUrl) {
    if(/[a-zA-z:]*\/\/[^\s]*/.test(labelUrl)){
        if(labelUrl.indexOf('?') > 0){
            labelUrl = url.resolve(webUrl, labelUrl.split('?')[0]);
            return labelUrl;
        }else {
            return labelUrl;
        }
    }else if(labelUrl.indexOf('?') > 0){
        labelUrl = url.resolve(webUrl, labelUrl.split('?')[0]);
        return labelUrl;
    }else {
        labelUrl = url.resolve(webUrl, labelUrl);
        return labelUrl;
    }
}


module.exports = router;
