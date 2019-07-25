/*!
  * https://www.instapio.com
  * Copyright(c) 2013-2017 Instapio, Inc
 MIT Licensed
*/

// pliny1-branch test   
     
var jwt = require('jwt-simple');
module.exports = function(req, res, next) {
    try {
        if (req.query.jwt !== undefined || req.query.state !== undefined) {
            var token = "something";
            if (req.query.jwt !== undefined) {
                token = req.query.jwt
            }
            if (req.debug) req.debug("JWT Token:" + token);
            req.vars = jwt.decode(token, global.config.INSTAPIO_CLIENT_SECRET);
            res.locals.TOKEN = token;
            var keys = Object.keys(req.vars);
            for (var i = 0; i < keys.length; i++) {
                res.locals[keys[i]] = req.vars[keys[i]];
            }
            res.locals.INSTAPIO_SDKJS = req.vars.environment_url + "/assets/instapio_sdk.js";
            if (req.vars.environment_name && req.vars.environment_url) {
                console.log("Checking Environments Cache");
                var env_name = req.vars.environment_name;
                var env_url = req.vars.environment_url;
                if (req.cache && req.cache.get) {
                    console.log("Checking Environments In Cache");
                    req.cache.get("environments", function(err, environments) {
                        console.log("Checking Environments Cache Result" + JSON.stringify(environments));
                        if (err || environments === undefined || environments == null) {
                            console.log("Checking Environments Not In Cache");
                            req.db.load('all', 'environments', 'environments', function(err, env_entity) {
                                console.log("Checking Environments Loaded from DB");
                                if (env_entity === undefined || environments == null) {
                                    console.log("Checking Environments Not Defined in DB");
                                    env_entity = { environments: {} }
                                }
                                console.log(env_entity);
                                if (env_entity.environments === undefined) env_entity.environments = {};
                                console.log("Checking Environments Setting Object");
                                env_entity.environments[env_name] = env_url;
                                req.db.save('all', 'environments', 'environments', env_entity, function(err) {
                                    console.log("Checking Environments Saved DB");
                                    req.cache.set("environments", env_entity.environments, function(err) {
                                        console.log("Checking Environments Saved Cache");
                                    })
                                })
                            })
                        } else {
                            if (environments[env_name] === undefined) {
                                req.db.load('all', 'environments', 'environments', function(err, env_entity) {
                                    console.log("Checking Environments Loaded from DB");
                                    if (environments === undefined) {
                                        console.log("Checking Environments Not Defined in DB");
                                        env_entity = { environments: {} }
                                    }
                                    if (env_entity.environments === undefined) env_entity.environments = {};
                                    console.log("Checking Environments Setting Object");
                                    env_entity.environments[env_name] = env_url;
                                    req.db.save('all', 'environments', 'environments', env_entity, function(err) {
                                        console.log("Checking Environments Saved DB");
                                        req.cache.set("environments", env_entity.environments, function(err) {
                                            console.log("Checking Environments Saved Cache");
                                        })
                                    })
                                })
                            }
                        }

                    })
                }
            }
            if (req.debug) req.debug("JWT Data:" + JSON.stringify(req.vars));
            if (global.config.OAUTH !== "" && req.baseUrl != "/oauth") {
                req.db.account.load(req.vars.environment_name, req.vars.account_id, function(err, account) {
                    req.debug("Account Loaded:");
                    req.debug(account);
                    if (global.app.oauth_verify !== undefined) {
                        global.app.oauth_verify(req, account, function(err) {
                            if (err) {
                                res.render('oauth_required', { token: token });
                                return;
                            }
                            next();
                        });
                    } else {
                        if (account !== undefined && account.access_token !== undefined && account.access_token !== null && account.access_token != "") {
                            next();
                        } else {
                            res.render('oauth_required', { token: token });
                        }
                    }
                })
            } else {
                next();
            }
        } else {
            if (req.body !== undefined && req.body.push_secret !== undefined) {
                if (req.debug) req.debug("Push Secret Authentication");
                if (req.body.push_secret == global.config.INSTAPIO_PUSH_SECRET) {
                    if (req.debug) req.debug("Push Secret Authenticated");
                    return next();
                }
            }
            res.render('oauth_fail');
        }
    } catch (e) {
        if (req.error !== undefined) {
            req.error("Exception in JWT");
            req.error(e);
        } else {
            console.log("Exception in JWT");
            console.log(e);
        }
        res.render('oauth_fail');

    }
}

module.exports();
