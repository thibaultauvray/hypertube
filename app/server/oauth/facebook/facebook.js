module.exports =  function (app, passport) {

    var mongoose = require('../../../mongoose'),
        User = require('../../../user_schema'),
        FacebookStrategy = require('passport-facebook').Strategy;

    var oauth = {
        clientID: '1613889238920050', // your App ID
        clientSecret: '5a8feefcd41e7e9562c25f4462f8bcda', // your App Secret
        callbackURL: 'http://localhost:3000/auth/facebook/callback',
        profileURL: 'https://graph.facebook.com/v2.8/me?fields=first_name,last_name,email'
    };

    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));
    app.get('/auth/facebook/callback',			// handle the callback after facebook has authenticated the user
        passport.authenticate('facebook', {
            successRedirect : '/app/accueil',
            failureRedirect : '/'
        }));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    function setSession(req, user){
        if (user._id)
            req.session.id = user._id;
        req.session.username = user.username;
        req.session.mail = user.mail;
        req.session.firstname = user.firstname;
        req.session.lastname = user.lastname;
        req.session.language = user.language;
    }

    var fbStrategy = oauth;
    fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new FacebookStrategy(fbStrategy,
        function (req, token, refreshToken, profile, done) {
            // asynchronous
            process.nextTick(function () {

                    User.findOne({'facebook_id': profile.id}, function (err, user) {
                        if (err)
                            return done(err);
                        // console.log(user);
                        if (user) {

                            // if there is a user id already but no token (user was linked at one point and then removed)
                            if (!user.facebook_token) {
                                user.facebook_token = token;


                                setSession(req, user);

                                user.save(function (err) {
                                    if (err)
                                        return done(err);

                                    return done(null, user);
                                });
                            }
                            setSession(req, user);

                            return done(null, user); // user found, return that user
                        } else {
                            // if there is no user, create them
                            var newUser = new User();

                            newUser.facebook_id = profile.id;
                            newUser.facebook_token = token;
                            newUser.firstname = profile.name.givenName;
                            newUser.lastname = profile.name.familyName;
                            newUser.username = profile.name.givenName + '_' + profile.name.familyName;
                            newUser.mail = (profile.emails[0].value || '').toLowerCase();
                            newUser.avatar = "http://graph.facebook.com/ "+ profile.id +"/picture?type=large";

                            setSession(req, newUser);

                            newUser.save(function (err) {
                                if (err)
                                    return done(err);

                                return done(null, newUser);
                            });
                        }
                    });
            });

        })
    )
};