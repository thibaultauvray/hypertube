var login = function(req, res, next) {
	//console.log(req.session);
	res.render('login', {
		isApp : false,
		title : 'Hypertube - Login'
	});
};

module.exports = login;
