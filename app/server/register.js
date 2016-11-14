var register = function(req, res, next) {
	//console.log(req.session);
	res.render('register', {
		isApp : false,
		title : 'Hypertube - Register'
	});
};

module.exports = register;
