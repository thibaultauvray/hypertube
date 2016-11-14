var logout = function(req, res, next) {
	req.session.destroy(function(err) {
		if (!err)
			res.redirect('/');
	});
};

module.exports = logout;
