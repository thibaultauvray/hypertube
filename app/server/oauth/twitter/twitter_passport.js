module.exports =  function (app, passport) {

    var mongoose = require('../../../mongoose'),
        User = require('../../../user_schema'),
        TwitterStrategy = require('passport-twitter').Strategy;

    var oauth = {
        consumerKey       : 'uM7QpJ2XrOUMxxQ533EMbJewh',
        consumerSecret    : '42yNgEtM4bLimawSYG1vE7TO4a7qspoIjcb8VnjKuPgzHu4jJj',
        callbackURL       : 'http://127.0.0.1:3000/auth/twitter/callback',
        passReqToCallback : true
    };

    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback',			// handle the callback after facebook has authenticated the user
        passport.authenticate('twitter', {
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
        if (user.twitter_id)
            req.session.id = user.twitter_id;
        req.session.username = user.username;
        // req.session.mail = user.mail;
        req.session.firstname = user.firstname;
        req.session.lastname = user.lastname;
        req.session.language = user.language;
    }

    // var fbStrategy = oauth;
    // fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new TwitterStrategy(oauth,
        function (req, token, tokenSecret, profile, done) {
            // asynchronous
            process.nextTick(function () {
                User.findOne({ twitter_id : profile.id }, function(err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database
                    if (err)
                        return done(err);

                    // if the user is found then log them in
                    if (user) {
                        setSession(req, user);
                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser = new User();
                        // set all of the user data that we need
                        newUser.twitter_id = profile.id;
                        newUser.token_twitter = token;
                        newUser.username = profile.username;
                        newUser.firstname = profile.displayName;
                        newUser.lastname = '';
                        newUser.avatar = profile.photos[0].value.replace("_normal", "");

                        setSession(req, newUser);

                        // save our user into the database
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });
            });

        })
    )
};