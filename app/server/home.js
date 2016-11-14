var home = function(req, res, next) {
	//console.log(req.session);
	res.render('home', {
		isApp : false,
		title : 'Hypertube - Home'
	});
};

module.exports = home;
