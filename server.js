var express = require('express');
var app = express();

// app.use(express.static('public'));
// app.get('/', function(req, res){	
	// res.render();	
// });
app.use(express.static(__dirname + '/web'));

var port = process.env.PORT || 8888;
app.listen(port);