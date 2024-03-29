/*global mw:true */
/* This is my personal javascript library which I call Flash */
/* It can: 
	a) gather all tokens (save patrol) 
	b) do virtually any action save WMF ones like pagetriage and articlefeedback
	c) Perform queries (limited for now, to be expanded in the next version)
*/

/* DISCLAIMER: BEFORE 1.0 IT CAN AND WILL GO THROUGH CHANGES THAT MAY BREAK THE API */
$(function () {


	//Constants
	var QUERY = 1, ACTION = 2;

	//Holds all the modules
	var modules = {
		version: "0.72 Hydra"
	};

	/*** CONSTRUCTORS ***/

	//This is called once, by the Flash variable at the bottom of this script
	var Flash_main = function () {
		this.go = function (module) {
			//we could technically do everything in the Flash_main class
			//but I prefer to have new instances for each new request
			return new door(module);
		};
	};

	//door is the class that actually executes the request
	//The reason that we cant do the code in Flash_main is because if we executed the queries
	//there then all the requests would go through one instance of the class because the Flash_main
	//object is only created once. Instead, in Flash_main, all we do is create a new door from which
	//all the code is executed, so there is a new instance of the door class for each request
	var door = function (module) {
		this.token = '';
		this.module = module;
		this.reqType = modules[module].reqType;
	};

	/*** META FUNCTIONS ***/

	/* Logs stuff */
	var log = (window.console && function () {
		var args = Array.prototype.slice.call(arguments);
		args.unshift('Flash:');
		return window.console.log.apply(window.console, args);
	}) || $.noop;

	/* Does ajax call to API */
	var ajax = function (type, url, token, cb, special) {
		type = type.toLowerCase();
		special = !!special;

		if (type === "get") {
			var realcb = token;
			$.getJSON(mw.util.wikiScript('api')+url+'&format=json').then(function (data) {
				realcb(data);
			});
		} else if (type === "post") {
			if (special === true) {
				var sptoken = token === false ? '' : '&token=' + token;
				$.post(mw.util.wikiScript('api')+url+sptoken+'&format=json').then(function (data) {
					cb(data);
				});
			} else {
				var rtoken = token === false ? '' : token;
				$.ajax({
					url: mw.util.wikiScript('api')+url+'&format=json',
					type: 'POST',
					dataType: 'json',
					data: {
						token: rtoken
					}
				}).done (function (data) {
					cb(data);
				}).fail(function (data) {
					cb(data);
				});
			}
		}
	};

	/*** DOOR FUNCTIONS ***/

	/* Load arguments */
	door.prototype.load = function (params) {
		this.params = params;
		return this;
	};

	/* Load callback */
	door.prototype.wait = function (cb) {
		var checkedCB = (typeof cb != undefined && typeof cb === "function") ? cb : function () {};
		this.callback = checkedCB;
		return this;
	};

	/* Start Token calls */

	/* This gets all tokens that are accessible from ?action=tokens */
	door.prototype.getToken = function(token, targ) {
		log("Token:", token);
		// set vars
		var me = this, 
			module = token === 'delete' ? 'del' : token;
		token = token.toLowerCase();
		
		// verification
		if (token.match(/(rollback|userrights|undelete)/)) this.specialToken(token, targ);
		if (!token.match(/(edit|delete|protect|move|block|options|unblock|email|import|watch)/)) return false;
		// go
		var tURL = '?action=tokens&type='+token;
		
		ajax("get", tURL, function (data) {
			me.token = data.tokens[token+"token"];
			modules[module].run(me.params, me.token, me.callback);
		});
	};

	/* This gets tokens not accessible from ?action=tokens */
	door.prototype.specialToken = function(token, targ) {
		var me = this;
		// verify
		if (token.match(/(rollback|undelete|userrights)/i) === null) return false;
		//go
		switch (token) {
			case 'rollback':
				var rbtURL = '?action=query&prop=revisions&rvtoken=rollback&indexpageids=1&titles='+targ;
				ajax('get', rbtURL, function (data) {
					me.token = encodeURIComponent(data.query.pages[data.query.pageids[0]].revisions[0].rollbacktoken);
					modules[token].run(me.params, me.token, me.callback);
				});
				break;
			case 'undelete':
				var detURL = '?action=query&list=deletedrevs&titles='+targ+'&drprop=token';
				ajax('get', detURL, function (data) {
					me.token = encodeURIComponent(data.query.deletedrevs[0].token);
					modules[token].run(me.params, me.token, me.callback);
				});
					break;
			case 'userrights':
				var urURL = '?action=query&list=users&ustoken=userrights&indexpageids=1&ucusers='+targ;
				ajax('get', urURL, function (data) {
					me.token = encodeURIComponent(data.query.users[0].userrightstoken);
					modules[token].run(me.params, me.token, me.callback);
				});
				break;
			default:
				me.token = false;
				break;
		}	
	};

	/* Runs query/action */
	door.prototype.run = function () {
		var tokenModule = this.module === 'del' ? 'delete' : this.module,
			targ = this.params.targ != "undefined" ? this.params.targ : '';

		if (this.reqType === ACTION) {
			this.getToken(tokenModule, targ);
		} else if (this.reqType === QUERY) {
			modules[this.module].run(this.params, this.callback);
		}
	};

	/*** MODULES BEGIN ***/


	/* Start Action modules */
	modules.edit = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var minor = 'notminor=true', 
				twhere = 'text';
			if (params.isMinor != "undefined" && params.isMinor === true) minor = 'minor=true';
			if (params.where != "undefined" && (params.where === "appendtext" || params.where ===  "prependtext")) twhere = params.where;
			//action
			var eURL = '?action=edit&title='+params.targ+'&summary='+params.summary+'&'+twhere+'='+params.text+'&'+minor;
			ajax("post", eURL, token, callback);
		}
	};

	modules.rollback = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var rbURL = '?action=rollback&title='+params.targ+'&user='+params.user;
			if (params.summary != "undefined" && params.summary !== false) rbURL += '&summary=' + params.summary;
			ajax("post", rbURL, token, callback, true);
		}
	};

	modules.del = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var deURL = '?action=delete&title='+params.targ+'&reason='+params.summary;
			ajax("post", deURL, token, callback);
		}
	};

	modules.protect = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var cascade = '',
				exp = 'never';
			if (params.expiry != "undefined" && params.cascading === true) cascade = "&cascade";
			if (params.expiry != "undefined" && params.expiry !== false) exp = params.expiry;
			// action
			var prURL = '?action=protect&title='+params.targ+'&protections='+params.level+cascade+'&expiry='+exp+'&reason='+params.summary;
			ajax("post", prURL, token, callback);	
		}
	};

	modules.move = {
		reqType: ACTION,
		run: function (params, token, callback) {
			// params
			var talk = '', sub = '';
			if (params.mTalk != "undefined" && params.mTalk === true) talk = '&movetalk';
			if (params.mSub != "undefined" && params.mSub === true) sub = '&movesubpages';
			//action
			var mURL = '?action=move&from='+params.targ+'&to='+params.to+'&reason='+params.summary+sub+talk;
			ajax("post", mURL, token, callback);		
		}
	};

	modules.userrights = {
		reqType: ACTION,
		run: function (params, token, callback) {
			// params
			var add = '', rm = '';
			if (params.adds != "undefined" && params.adds !== false) add = '&add='+params.adds;
			if (params.remove != "undefined" && params.remove !== false) rm = '&remove'+params.remove;
			//action
			var urURL = '?action=userrights&user='+params.targ+add+rm+'&reason='+params.summary;
			ajax("post", urURL, token, callback, true);
		}
	};

	modules.block = {
		reqType: ACTION,
		run: function (params, token, callback) {
			//params
			var expiry = 'never', nemail = '', ablock = '', atalk = '', ncreate = '', anononly = '';
			if (params.expire != "undefined" && params.expire !== false) expiry = params.expire;
			if (params.noemail != "undefined" && params.noemail === true) nemail = '&noemail';
			if (params.autoblock != "undefined" && params.autoblock === true) ablock = '&autoblock';
			if (params.allowtalk != "undefined" && params.allowtalk === true) atalk = '&allowusertalk';
			if (params.nocreate != "undefined" && params.nocreate === true) ncreate = '&nocreate';
			if (params.onlyanon != "undefined" && params.onlyanon === true) anononly = '&anononly';
			//action
			var blURL = '?action=block&user='+params.targ+'&expiry='+expiry+'&reason='+params.summary+nemail+ablock+atalk+ncreate+anononly;
			ajax("post", blURL, token, callback);
		}
	};

	modules.email = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var emURL = '?action=emailuser&target='+params.targ+'&subject='+params.subject+'&text='+params.text;
			if (params.ccme != "undefined" && params.ccme === true) emURL += '&ccme';
			//action
			ajax("post", emURL, token, callback);
		}
	};

	modules.unblock = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var ubURL = '?action=unblock&user='+params.user+'&reason='+params.summary;
			ajax("post", ubURL, token, callback);
		}
	};

	modules.undelete = {
		reqType: ACTION,
		run: function (params, token, callback) {
			//params
			var timestamp = '';
			if (params.timestamps != "undefined" && params.timestamps !== false) timestamp = '&timestamps='+params.timestamps;
			//undelete
			var udURL = '?action=undelete&title='+params.targ+'&reason='+params.summary+timestamp;
			ajax("post", udURL, token, callback, true);
		}
	};

	modules.watch = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var wURL = '?action=watch&title='+ params.targ;
			ajax("post", wURL, token, callback);
		}
	};

	modules.unwatch = {
		reqType: ACTION,
		run: function (params, token, callback) {
			var uwURL = '?action=watch&title='+params.targ+'&unwatch=';
			ajax("post", uwURL, token, callback);
		}
	};

	modules.login = {
		reqType: ACTION,
		run: function (params) {
			//NOTE: Flash DOES NOT SAVE EITHER YOUR USERNAME OR PASSWORD
			//For script developers- Flash doesn't allow for a callback argument on this 
			ajax("post", '?action=login&lgname='+params.username+'&lgpassword='+params.password, false, function (data) {
				ajax("post", '?action=login&lgtoken='+data.login.token+'&lgname='+params.username+'&lgpassword='+params.password, false, document.location.reload());
			});
		}
	};

	modules.logout = {
		reqType: ACTION,
		run: function (params, token, callback) {
			ajax("post", '?action=logout', false, callback);
		}
	};

	/* Start Query Modules */
	modules.exists = {
		reqType: QUERY,
		run: function (params, callback) {
			ajax("get", '?action=query&prop=info&indexpageids=1&titles='+params.targ, function (data) {
				if (data.query.pages[data.query.pageids].missing === '') callback(true);
				else return callback(false);
			});
		}
	};

	modules.getCreator = {
		reqType: QUERY,
		run: function (params, callback) {
			ajax("get", '?action=query&prop=revisions&indexpageids=1&titles='+params.targ+'&rvlimit=1&rvprop=user&rvdir=newer', function (data) {
				var creator = data.query.pages[data.query.pageids[0]].revisions[0].user;
				if (creator !== undefined) callback(creator);
				else callback(false);
			});
		}
	};

	modules.getUserContribs = {
		reqType: QUERY,
		run: function (params, callback) {
			ajax("get", '?action=query&list=usercontribs&uclimit='+params.number+'&ucuser='+params.user+'&ucprop=ids|title|flags|timestamp|comment', callback);
		}
	};

	modules.getPage = {
		reqType: QUERY,
		run: function (params, callback) {
			// verification
			if (params.revisions > 500) params.revisions = 500;
			if (params.properties == undefined) params.properties = 'user|content|ids';
	 
			// go
			ajax("get", '?action=query&prop=revisions&titles='+params.targ+'&rvprop='+params.properties+'&rvlimit='+params.revisions+'&indexpageids=1', function (data) {
				if (data.query.pageids[0] === "-1") { 
					callback(false);
				} else {
					var info = data.query.pages[data.query.pageids[0]], res = {};
	 
					for (var i = 0; i < info.revisions.length; i++) { // for each revision
						res[i] = {};

						// get user
						if (params.properties.match(/user/i) !== null) {
							res[i].user = info.revisions[i].user;
						}

						// get content
						if (params.properties.match(/content/i) !== null) {
							res[i].content = info.revisions[i]['*'];
						}

						if (params.properties.match(/ids/i) !== null) {
							res[i].ids = {
								revid: info.revisions[i].revid,
								parentid: info.revisions[i].parentid
							};
						}
					}
					callback(res);
				}
			});
		}
	};

	/*** RUN CODE ***/

	//init is the only instance of Flash_main
	//Then Flash becaomes the go function for init
	//When Flash is called it executes the code in Flash_main.prototype.go,
	//which creates a new door as explained earlier in the code
	var init = new Flash_main();
	window.Flash = init.go;

	log('loaded version ' + modules.version);
});