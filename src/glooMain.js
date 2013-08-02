/*global mw:true, jin:true */

// INCLUDES
function iglooViewable () {


}
_iglooViewable = new iglooViewable();



// iglooMain development copy
  // based off code by Alex Barley
  // base code test only
	
	// expected jQuery 1.7.*, jin 1.04a+, Mediawiki 1.19

/*
	CLASSES ==========================
	*/
	
// Class iglooUserSettings
	/*
	** iglooUserSettings is the class that holds the settings
	** for a particular user. The settings for a session can
	** be stored in JSON format for a particular user and then
	** parsed into the program to provide saving and loading.
	**
	** If no settings are loaded, the defaults specified in the
	** class itself will simply apply.
	**
	** It is written here in simplified object form to ensure
	** it can be parsed as expected.
	*/
var iglooConfiguration = {
	api: mw.config.get('wgServer') + mw.config.get('wgScriptPath') + '/api.php',

	defaultContentScore: 20
};

var iglooUserSettings = {
	// Ticker
	
	// Requests
	limitRequests: 5,

	// Misc
	maxContentSize: 50,
	sig: "([[User:Ale_jrb/Scripts/igloo|GLOO]])",
	serverLoc: 'https://raw.github.com/Kangaroopower/Igloo/master/',
	version: "0.1 Phoenix",

	// Modules

	//Rollback Module
	vandalTemplate: 'vandalism',
	warningMessage: '{'+'{subst:uw-%MESSAGE%%LEVEL%|%PAGE%|2=The reverted edit can be found <span class="plainlinks">[%DIFF% here]</span>.}'+'}<!'+'-- igloo:%MESSAGE%%LEVEL% --'+'> ~~'+'~~',
	warningSummary: 'Level %LEVEL% warning re. vandalism on [[%PAGE%]] ([[User:Ale_jrb/Scripts/igloo|GLOO]])',
	rollbackSummary: 'Reverted edits by [[Special:Contributions/$2|$2]] to last version by $1 ([[User:Ale_jrb/Scripts/igloo|GLOO]])',
 
	warningsOldAfter: 2, // days after which warnings are considered irrelevant
 
	aiv: 'Wikipedia:Administrator intervention against vandalism',
	aivWhere: 'appendtext',
	aivIp: 'IPvandal',
	aivUser: 'vandal',
	aivMessage: '* {'+'{%TEMPLATE%|%USER%}'+'} - vandalism after final warning. ~~'+'~~',
	aivSummary: 'Reporting [[Special:Contributions/%USER%|%USER%]] - vandalism after final warning ',
	notifyWarningDone: true,

	//History Module
	histWinTimeout: 0.8,
	maxHistory: 20
};

function getp (obj) {
	if (Object.getPrototypeOf) {
		return Object.getPrototypeOf(obj);
	} else if (obj.__proto__) {
		return obj.__proto__;
	} else return false;
}

function iglooQueue () {
	var internal = [];

	this.push = function (item) {
		internal.push(item);
		return this;
	};

	this.pop = function () {
		if (typeof arguments[0] === 'number') {
			var n = arguments[0];
			if (n > internal.length) n = internal.length;
			return internal.splice(0, n);
		} else
			return internal.shift();
	};

	this.get = function () {
		if (internal[0]) return internal[0];
			else return false;
	};
}




// Class iglooMain
	/*
	** iglooMain is the running class for igloo. It handles:
	** - Building the core interface and starting daemons
	** - Loading external modules
	** - Hooking modules into the correct place
	*/
function iglooMain () {
	var me = this;
	
	// Define state
	this.canvas = null; // igloo exposes its primary canvas to modules for use.
	this.toolPane = null; // igloo exposes its primary toolpane to modules for use.
	this.content = null; // igloo exposes the content panel for convenience.
	this.diffContainer = null; // igloo exposes the diff container for convenience.
	this.ticker = null; // igloo exposes its ticker panel for convenience.

	this.currentView = null;
	
	this.modules = {};

	this.launch = function () {
		if (mw.config.get('wgPageName') !== 'User:Ale_jrb/igDev') return;
		this.buildInterface();

		this.currentView = new iglooView();
		this.recentChanges = new iglooRecentChanges();
		this.contentManager = new iglooContentManager();
		this.statusLog = new iglooStatus();

		this.recentChanges.setTickTime(2000);
		this.statusLog.buildInterface();

		this.loadModules(); 
	};

	this.buildInterface = function () {
		try {
			// Create drawing canvas
			this.canvas = new jin.Canvas();
			this.canvas.setFullScreen(true);
			
			// Create base splitter.
			var mainPanel = new jin.SplitterPanel();
			mainPanel.setPosition(0, 0);
			mainPanel.setSize(0, 0);
			mainPanel.setInitialDrag(260);
			mainPanel.setColour(jin.Colour.DARK_GREY);
			mainPanel.dragWidth = 1;
			
			mainPanel.left.setColour(jin.Colour.DARK_GREY);
			mainPanel.right.setColour(jin.Colour.WHITE);
			
			// Expose recent changes panel.
			this.ticker = mainPanel.left;
			
			// Create toolbar pane.
			this.toolPane = new jin.Panel();
			this.toolPane.setPosition(0, 0);
			this.toolPane.setSize(0, 100);
			this.toolPane.setColour(jin.Colour.WHITE);
			
			// Create toolbar border.
			var toolBorder = new jin.Panel();
			toolBorder.setPosition(0, 100);
			toolBorder.setSize(0, 1);
			toolBorder.setColour(jin.Colour.DARK_GREY);
			
			// Create content panel.
			this.content = new jin.Panel();
			this.content.setPosition(0, 101);
			this.content.setSize(0, 0);
			this.content.setColour(jin.Colour.WHITE);

			//Status bar
			this.statusBar = new jin.Panel()
			this.statusBar.setPosition(0, 0);
			this.statusBar.setSize(0, 11);
			this.statusBar.setColour(jin.Colour.GREY);

			//statusBorder
			var statusBorder = new jin.Panel();
			statusBorder.setPosition(0, 11);
			statusBorder.setSize(0, 1);
			statusBorder.setColour(jin.Colour.DARK_GREY);

			// Create diff container.
			this.diffContainer = new jin.Panel();
			this.diffContainer.setPosition(0, 13);
			this.diffContainer.setSize(0, (mainPanel.right.getHeight() - 160));
			this.diffContainer.setColour(jin.Colour.WHITE);
			this.diffContainer.setOverflow('auto');
			
			// Combine interface elements.
			this.content.add(this.statusBar);
			this.content.add(statusBorder);
			this.content.add(this.diffContainer);
			mainPanel.right.add(this.toolPane);
			mainPanel.right.add(toolBorder);
			mainPanel.right.add(this.content);
			this.canvas.add(mainPanel);
			
			// Do initial render.
			this.canvas.render(jin.getDocument());

			this.fireEvent('core','interface-rendered', true);
		} catch (e) {
			jin.handleException(e);
		}
	};


	/*
		UI ======================
		*/
	this.getCurrentView = function () {
		return this.currentView;
	};


	/*
		EVENTS ==================
		*/
	this.announce = function (moduleName) {
		if (!this.modules[moduleName]) this.modules[moduleName] = {};
		this.modules[moduleName]['exists'] = true;
		this.modules[moduleName]['ready'] = true;
	};

	this.isModuleReady = function (moduleName) {
		if (!this.modules[moduleName]) return false;
		return this.modules[moduleName]['ready'];
	};

	this.hookEvent = function (moduleName, hookName, func) {
		if (hookName === 'exists' || hookName === 'ready') return 1;

		if (!this.modules[moduleName]) { 
			this.modules[moduleName] = {};
			this.modules[moduleName]['exists'] = true;
			this.modules[moduleName]['ready'] = false; 
		}

		if (!this.modules[moduleName][hookName]) {
			this.modules[moduleName][hookName] = [func];
		} else {
			this.modules[moduleName][hookName].push(func);
		}

		return 0;
	};

	this.unhookEvent = function (moduleName, hookName, func) {
		if (this.modules[moduleName]) {
			if (this.modules[moduleName][hookName]) {
				for (var i = 0; i < this.modules[moduleName][hookName].length; i++) {
					if (this.modules[moduleName][hookName][i] === func)
						this.modules[moduleName][hookName][i] = null;
				}
			}
		}
	};

	this.fireEvent = function (moduleName, hookName, data) {
		if (this.modules[moduleName]) {
			if (this.modules[moduleName][hookName]) {
				for (var i = 0; i < this.modules[moduleName][hookName].length; i++) {
					if (this.modules[moduleName][hookName][i] !== null)
						this.modules[moduleName][hookName][i](data);
				}
			}
		}
	};

	this.loadModules = function () {
		// do nothing
		this.justice = new iglooReversion();
		this.justice.buildInterface();
		this.announce('rollback');

		this.hist = new iglooTime();
		this.hist.buildInterface();
		this.announce('hist');

		this.fireEvent('core', 'modules-loaded', true);
	};
}



// Class iglooContentManager
	/*
	** iglooContentManager keeps track of iglooPage items
	** that are loaded by the recent changes ticker or at
	** the user request. Because igloo cannot store all
	** changes for the duration of the program, it must
	** decide when to discard the page item to save memory.
	** The content manager uses a relevance score to track
	** items. This score is created when the manager first
	** sees the page and decreases when the content manager
	** sees activity. When an item reaches 0, it is open
	** to be discarded. If an item sees further actions, its
	** score can be refreshed, preventing it from being
	** discarded for longer.
	*/
function iglooContentManager () {
	this.contentSize = 0;
	this.discardable = 0;
	this.content = {};

	this.add = function (page) {
		this.decrementScores();
		this.contentSize++;
		this.content[page.info.pageTitle] = {
			exists: true,
			page: page,
			hold: true,
			timeAdded: new Date(),
			timeTouched: new Date(),
			score: iglooConfiguration.defaultContentScore
		};

		console.log("IGLOO: Added a page to the content manager. Size: " + this.contentSize);
		this.gc();

		return this.content[page.info.pageTitle];
	};

	this.getPage = function (title) {
		if (this.content[title]) {
			return this.content[title].page;
		} else {
			return false;
		}
	};

	this.decrementScores = function () {
		var s = "IGLOO: CSCORE: ";
		for (var i in this.content) {
			if (this.content[i].score > 0) {
				s += this.content[i].score + ", ";
				if (--this.content[i].score === 0) {
					console.log("IGLOO: an item reached a score of 0 and is ready for discard!");
					this.discardable++;
				}
			}
		}
		console.log(s);
	};

	this.gc = function () {
		console.log("IGLOO: Running GC");
		if (this.discardable === 0) return;
		if (this.contentSize > iglooUserSettings.maxContentSize) {
			console.log("IGLOO: GC removing items to fit limit (" + this.contentSize + "/" + iglooUserSettings.maxContentSize + ")");
			var j = 0, lastZeroScore = null, gcVal = 0.3, gcStep = 0.05;
			for (var i in this.content) {
				if (this.content[i].score !== 0 || this.content[i].isRecent !== false || this.content[i].page.displaying !== false) {
					j++;
					gcVal += gcStep;
					continue;
				} else {
					lastZeroScore = i;
				}

				if (j === this.contentSize - 1) {
					if (lastZeroScore !== null) {
						console.log("IGLOO: failed to randomly select item, discarding the last one seen");
						this.content[lastZeroScore] = undefined;
						this.contentSize--;
						this.discardable--;
						break;
					}
				}

				if (this.content[i].score === 0 
					&& this.content[i].isRecent === false 
					&& Math.random() < gcVal
					&& this.content[i].page.displaying === false) {

					console.log("IGLOO: selected an item suitable for discard, discarding");
					this.content[i] = undefined;
					this.contentSize--;
					this.discardable--;
					break;
				} else {
					j++;
					gcVal += gcStep;
				}
			}
		}
	};
}




// Class iglooRecentChanges
	/*
	** iglooRecentChanges is the ticker class for igloo.
	** With no modules loaded, igloo simply acts as a recent
	** changes viewer. This class maintains the list of 
	** iglooPage elements that represent wiki pages that have
	** recently changed. Each pages contains many diffs. Once
	** created, this class will tick in the background and
	** update itself. It can be queried and then rendered at
	** any point.
	*/
function iglooRecentChanges () {
	var me = this;
	
	console.log ( 'IGLOO: generated RC ticker' );
	
	this.tick = null;
	this.loadUrl = iglooConfiguration.api;
	this.tickTime = 4000;
	this.recentChanges = [];

	// Methods
	this.setTickTime = function (newTime) {
		this.tickTime = newTime;
		clearInterval(this.tick);
		this.tick = setInterval(function () { me.update.apply(me); }, this.tickTime);
	};
	
	// Constructor
	this.renderResult = document.createElement('ul'); // this is the output panel
	$(this.renderResult).css({
		'position': 'absolute',
		'top': '0px',
		'left': '0px',
		'padding': '0px',
		'margin': '0px',
		'width': '100%',
		'height': '100%',
		'list-style': 'none inherit none',
		'overflow': 'auto',
		'color': 'white',
		'cursor': 'pointer'
	});
	$(me.renderResult).on ({
		mouseover: function () { $(this).css('backgroundColor', jin.Colour.GREY); },
		mouseout: function () { $(this).css('backgroundColor', jin.Colour.DARK_GREY); },
		click: function () { me.show.apply(me, [$(this).data('elId')]) ; }
	}, 'li');
	igloo.ticker.panel.appendChild(this.renderResult);
	
}

iglooRecentChanges.prototype.update = function () {
	var me = this;
	(new iglooRequest({
		url: me.loadUrl,
		data: { format: 'json', action: 'query', list: 'recentchanges' },
		dataType: 'json',
		context: me,
		success: function (data) {
			me.loadChanges.apply(me, [data]);
		}
	}, 0, false)).run();
};

iglooRecentChanges.prototype.loadChanges = function (changeSet) {
	var data = changeSet.query.recentchanges;
	
	// For each change, add it to the changeset.
	var l = data.length;
	for (var i = 0; i < l; i++) {
		
		// Check if we already have information about this page.
		var l2 = this.recentChanges.length, exists = false, p;
		for (var j = 0; j < l2; j++) {
			if (data[i].title === this.recentChanges[j].info.pageTitle) {
				p = igloo.contentManager.getPage(data[i].title);
				p.addRevision(new iglooRevision(data[i]));
				p.hold = true;
				exists = true;
				break;
			}
		}

		if (!exists) {
			p = new iglooPage(new iglooRevision(data[i]));
			igloo.contentManager.add(p);
			this.recentChanges.push(p);
		}
	}
	this.recentChanges.sort(function (a, b) { return b.lastRevision - a.lastRevision; });

	// Truncate the recent changes list to the correct length
	if (this.recentChanges.length > 30) {
		// Objects that are being removed from the recent changes list are freed in the
		// content manager for discard.
		for (var i = 30; i < this.recentChanges.length; i++) {
			console.log("IGLOO: Status change. " + this.recentChanges[i].info.pageTitle + " is no longer hold");
			var p = igloo.contentManager.getPage(this.recentChanges[i].info.pageTitle);
			p.hold = false;
		}
		this.recentChanges = this.recentChanges.slice(0, 30);
	}
	
	// Render the result
	this.render();
};

// ask a diff to show its changes
iglooRecentChanges.prototype.show = function (elementId) {
	this.recentChanges[elementId].display();
	
	return this;
};

iglooRecentChanges.prototype.render = function () {
	this.renderResult.innerHTML = '';
	for (var i = 0; i < this.recentChanges.length; i++) {
		// Create each element
		var t = document.createElement('li');
		
		// Styling
		$(t).css ({
			'padding': '0px 0px 0px 10px',
			'borderBottom': '1px solid #000000',
			'list-style-type': 'none',
			'list-style-image': 'none',
			'marker-offset': '0px',
			'margin': '0px'
		});
		
		// Finish
		if (this.recentChanges[i].isNewPage) {
			t.innerHTML = "<strong>N</strong> " + this.recentChanges[i].info.pageTitle;
		} else {
			t.innerHTML = this.recentChanges[i].info.pageTitle;
		}
		$(t).data("elId", i);
		this.renderResult.appendChild(t);
	}
	console.log("Rendered " + i + " recent changes.");
	
	return this;
};



// Class iglooView
	// iglooView represents a content view. There could be
	// multiple views, each showing their own bit of content.
	// iglooView can support viewing anything that inherits
	// from iglooViewable.

function iglooView () {
	var me = this;

	// State
	this.displaying = null;
	this.changedSinceDisplay = false;

	// Hook to relevant events
	igloo.hookEvent('core', 'displayed-page-changed', function (data) {
		if (me.displaying) {
			if (data.page === me.displaying.page) {
				this.changedSinceDisplay = true;
				this.displaying = data;
				this.displaying.show();
			}
		}
	});
}

iglooView.prototype.display = function (revision) {
	// If a revision is being displayed, set the displaying
	// flag for the page to false.
	if (this.displaying) {
		this.displaying.page.displaying = false;
		this.displaying.page.changedSinceDisplay = false;
	}

	// Set the new revision into the page, then show it.
	this.displaying = revision;
	this.displaying.show();
};




// Class iglooPage

function iglooPage () {
	var me = this;
	
	// Details
	this.info = {
		pageTitle: '',
		namespace: 0
	};
	this.lastRevision = 0;
	this.revisions = [];
	
	// State
	this.displaying = false; // currently displaying
	this.changedSinceDisplay = false; // the data of this page has changed since it was first displayed
	this.isNewPage = false; // whether this page currently only contains the page creation
	this.isRecent = false;
	
	// Methods
	
	// Revisions can be added to a page either by a history lookup, or 
	// by the recent changes ticker. The 'diff' attached to a revision
	// is always the diff of this revision with the previous one, though
	// other diffs can be loaded as requested (as can the particular 
	// content at any particular revision).
	
	// Constructor
	if (arguments[0]) {
		this.info.pageTitle = arguments[0].page;
		this.addRevision(arguments[0]);
	}
}

iglooPage.prototype.addRevision = function (newRev) {
	// Check if this is a duplicate revision.
	for (var i = 0; i < this.revisions.length; i++) {
		if (newRev.revId === this.revisions[i].revId) return;
	}

	if (this.isNewPage) {
		this.isNewPage = false;
	} else if (newRev.type === 'new') {
		this.isNewPage = true;
	}

	newRev.page = this;
	this.revisions.push(newRev);
	this.revisions.sort(function (a, b) { return a.revId - b.revId; });
	
	if (newRev.revId > this.lastRevision) this.lastRevision = newRev.revId;
	if (this.displaying) {
		alert('update');
		igloo.fireEvent('core', 'displayed-page-changed', newRev);
		this.changedSinceDisplay = true;
	}
};

iglooPage.prototype.display = function () {
	// Calling display on a page will invoke the display
	// method for the current view, and pass it the relevant
	// revision object.
	var currentView = igloo.getCurrentView();

	if (arguments[0]) {
		if (this.revisions[arguments[0]]) {
			currentView.display(this.revisions[arguments[0]]);
		} else {
			currentView.display(this.revisions.iglast());
		}
	} else {
		currentView.display(this.revisions.iglast());
	}
	this.displaying = true;
	this.changedSinceDisplay = false;
};



// Class iglooRevision
	/*
	** iglooRevision represents a revision and associated diff
	** on the wiki. It may simply represent the metadata of a
	** change, or it may represent the change in full.
	*/
function iglooRevision () {
	var me = this;
	
	// Content detail
	this.user = ''; // the user who made this revision
	this.page = ''; // the page title that this revision belongs to
	this.pageTitle = ''; // also the page title that this revision belongs to
	this.namespace = 0;
	this.revId = 0; // the ID of this revision (the diff is between this and oldId)
	this.oldId = 0; // the ID of the revision from which this was created
	this.type = 'edit';
	
	this.revisionContent = ''; // the content of the revision
	this.diffContent = ''; // the HTML content of the diff
	this.revisionRequest = null; // the content request for this revision.
	this.diffRequest = null; // the diff request for this revision
	this.revisionLoaded = false; // there is content stored for this revision
	this.diffLoaded = false; // there is content stored for this diff
	
	this.displayRequest = false; // diff should be displayed when its content next changes
	this.page = null; // the iglooPage object to which this revision belongs
	
	// Constructor
	if (arguments[0]) {
		this.setMetaData(arguments[0]);
	}
}

iglooRevision.prototype.setMetaData = function (newData) {
	this.page = newData.title;
	this.pageTitle = newData.title;
	this.namespace = newData.ns;
	this.oldId = newData.old_revid;
	this.revId = newData.revid;
	this.type = newData.type;
	this.retrieveUser();
};

iglooRevision.prototype.retrieveUser = function () {
	var me = this, userRequest = null;

	if (userRequest === null) {
		userRequest = new iglooRequest({
			url: iglooConfiguration.api,
			data: { format: 'json', action: 'query', prop: 'revisions', revids: '' + me.revId, rvprop: 'user', indexpageids: '1' },
			dataType: 'json',
			context: me,
			success: function (data) {
				this.user = data.query.pages[data.query.pageids[0]].revisions[0].user;
				userRequest = null;
			}
		}, 0, true);
		userRequest.run();
	}
}

iglooRevision.prototype.loadRevision = function (newData) {
	var me = this;

	igloo.justice.reversionEnabled = 'pause';

	if (this.revisionRequest === null) {
		this.revisionRequest = new iglooRequest({
			url: iglooConfiguration.api,
			data: { format: 'json', action: 'query', prop: 'revisions', revids: '' + me.revId, rvprop: 'content', rvparse: 'true' },
			dataType: 'json',
			context: me,
			success: function (data) {
				for (var i in data.query.pages) {
					this.revisionContent = data.query.pages[i].revisions[0]['*'];
				}
				this.revisionLoaded = true;
				if (this.displayRequest === 'revision') this.display('revision');
				this.revisionRequest = null;
			}
		}, 0, true);
		this.revisionRequest.run();
	}
};

iglooRevision.prototype.loadDiff = function () {
	var me = this;

	if (this.diffRequest === null) {
		console.log('Attempted to show a diff, but we had no data so has to load it.');
		this.diffRequest = new iglooRequest({
			url: iglooConfiguration.api,
			data: { format: 'json', action: 'compare', fromrev: '' + me.oldId, torev: '' + me.revId },
			dataType: 'json',
			context: me,
			success: function (data) {
				this.diffContent = data.compare['*'];
				this.diffLoaded = true;
				if (this.displayRequest === 'diff') this.display('diff');
				this.diffRequest = null;
			}
		}, 0, true);
		this.diffRequest.run();
	}
};

iglooRevision.prototype.display = function () {
	// Determine what should be displayed.
	var displayWhat;
        
	if (!arguments[0]) {
		displayWhat = 'diff';
	} else {
		displayWhat = arguments[0];
	}

	// If this was fired as a result of a display request, clear the flag.
	if (this.displayRequest) this.displayRequest = false;
	
	// Mark as displaying, and fire the displaying event.
	this.displaying = true;
	igloo.fireEvent('core', 'displaying-change', this);
	
	// Create display element.
	if (displayWhat === 'revision' || this.type === 'new') {
		var div = document.createElement('div');
		div.innerHTML = this.revisionContent;
		
		// Style display element.
		$(div).find('a').each(function () {
			$(this).prop('target', '_blank');
		});
		
		// Clear current display.
		$(igloo.diffContainer.panel).find('*').remove();
		
		// Append new content.
		igloo.diffContainer.panel.appendChild(div);

		//You can't rollback new pages
		igloo.fireEvent('rollback','new-diff', {
			pageTitle: '',
			revId: -1,
			user: ''
		});
	} else if (displayWhat === 'diff') {
		var table = document.createElement('table'), h2 = document.createElement('h2'), me = this;

		h2.id = 'iglooPageTitle';

		table.innerHTML = '<tr><td id="iglooDiffCol1" colspan="2"> </td><td id="iglooDiffCol2" colspan="2"> </td></tr>' + this.diffContent;
		h2.innerHTML = this.pageTitle;

		// Style display element.
		// TODO

		$(h2).css({'font-size' : '18px', 'margin-bottom': '5px', 'margin-top': '5px'});

		$(table).css({ 'width': '100%', 'overflow': 'auto' });
		$(table).find('#iglooDiffCol1').css({ 'width': '50%' });
		$(table).find('#iglooDiffCol2').css({ 'width': '50%' });

		$(table).find('.diff-empty').css('');
		$(table).find('.diff-addedline').css({ 'background-color': '#ccffcc' });
		$(table).find('.diff-marker').css({ 'text-align': 'right' });
		$(table).find('.diff-lineno').css({ 'font-weight': 'bold' });
		$(table).find('.diff-deletedline').css({ 'background-color': '#ffffaa' });
		$(table).find('.diff-context').css({ 'background-color': '#eeeeee' });
		$(table).find('.diffchange').css({ 'color': 'red' });
		
		// Clear current display.
		$(igloo.diffContainer.panel).find('*').remove();
		
		// Append new content.
		igloo.diffContainer.panel.appendChild(h2);
		igloo.diffContainer.panel.appendChild(table);

		//Alert rollback as to page info
		igloo.fireEvent('rollback','new-diff', {
			pageTitle: me.pageTitle,
			revId: me.revId,
			user: me.user
		});

		// we can now revert this edit
		if ( igloo.justice.reversionEnabled == 'pause' ) igloo.justice.reversionEnabled = 'yes';
	}
};

iglooRevision.prototype.show = function () {

	// Determine what to show.
	var displayWhat;
  
	if (!arguments[0]) {
		displayWhat = 'diff';
	} else {
		displayWhat = arguments[0];
	}

	if (displayWhat === 'diff' && this.type === 'edit') {
		console.log('IGLOO: diff display requested, page: ' + this.page.info.pageTitle);
		
		if ((!this.diffLoaded) && (!this.diffRequest)) {
			this.displayRequest = 'diff';
			this.loadDiff();
		} else {
			this.display('diff');
		}
	} else {
		console.log('IGLOO: revision display requested, page: ' + this.page.info.pageTitle);
		
		if ((!this.revisionLoaded) && (!this.revisionRequest)) {
			this.displayRequest = 'revision';
			this.loadRevision();
		} else {
			this.display('revision');
		}
	}
};

//Ckass iglooTime- sets up iglooHist
function iglooTime () {
	//Temporary- overwritten on a new diff load
	this.pageTitle = '';
	this.hist;

	//Receives info for new diff
	var me = this;
	igloo.hookEvent('history', 'new-diff', function (data) {
		me.pageTitle = data.pageTitle;
		me.hist = new iglooHist(data.pageTitle);
	});
}

iglooTime.prototype.buildInterface = function () {
	var histButton = document.createElement('div'), me = this;

	histButton.id = "igloo-hist"
	histButton.innerHTML = '<img src= "' + iglooUserSettings.serverLoc + 'images/igloo-hist.png">';

	$(histButton).mouseover(function () {
		if (me.pageTitle !== '') {
			if ( me.hist.timer ) { 
				clearTimeout ( me.hist.timer ); 
				me.hist.timer = false; 
			} else {
				me.hist.getHistory();
			}
		}
	});

	$(histButton).mouseout(function () {
		me.hist.timer = setTimeout(function() {
			me.hist.stop();
			me.hist.timer = false; 
		}, iglooUserSettings.histWinTimeout * 1000);
	});

	$(histButton).css({
		'position': 'relative',
		'float': 'right',
		'width': '73px',
		'height': '73px',
		'margin-top': '12px',
		'margin-left': '5px',
		'margin-right': '5px',
		'cursor': 'pointer',
	});

	var histCatcher = document.createElement('div'),
		histDisplay = document.createElement('div'), 
		histCont = document.createElement('ul');

	histDisplay.id = "igloo-hist-display";
	histCont.id = "igloo-hist-cont";
	histCatcher.id = "igloo-hist-catcher";
	
	$(histCatcher).css({
		top: '87px',
		width: '170px',
		height: '80px',
		opacity: 0,
		cursor: 'pointer',
		display: 'none'
	});

	$(histDisplay).css({
		top: '93px',
		width: '170px',
		backgroundColor: jin.Colour.GREY,
		border: '1px solid '+ jin.Colour.BLACK,
		padding: '2px',
		'font-size': '10px',
		cursor: 'pointer',
		display: 'none',
	});

	$(histCont).css({
		top: '87px',
		width: '100%',
		height: '100%',
		margin: '0px',
		padding: '0px',
		'overflow-x': 'hidden',
		'overflow-y': 'auto',
		display: 'none'
	});

	histCont.innerHTML = '';
	histCatcher.innerHTML = '';
	histDisplay.innerHTML = '<div id="igloo-hist-note" style="width: 100%;">loading page history - wait...</div>' + histCont;

	histButton.innerHTML += histCatcher + histDisplay + '';

	igloo.toolPane.panel.appendChild(histButton);
};

// Class iglooHist object handles the retrieval and display of the history of a page
function iglooHist (pageTitle) { 
	// timer var
	this.timer = null;
	this.pageTitle = pageTitle;
}
igloo.prototype.getHistory = function (callback, data) {
	// the get history module retrieves a page history and displays it to the user
	var me = this;

	switch ( callback ) {
		default: case 0:
			document.getElementById('igloo-hist-cont').innerHTML = 'loading page history - wait...';

 			document.getElementById('igloo-hist-display').style.display = 'block';
 			document.getElementById('igloo-hist-catcher').style.display = 'block';

 			// get the page history
			var pageHist = new iglooRequest({
				module: 'getPage',
				params: { targ: me.pageTitle, revisions: 15, properties: 'ids|user' },
				callback: function ( data ) {  me.getHistory ( 1, data ); }
			}, 0, true, true);
			pageHist.run();

			break;
 
		case 1:
			document.getElementById('igloo-hist-cont').style.display = 'block';
			document.getElementById('igloo-hist-note').style.display = 'none';
 
			var pageHistory = '';
			for (var i = 0; i < data.length; i ++ ) {
				var revision = data[i];
				var user = revision.user;
 
				pageHistory += '<li id="iglooHist_'+revision.ids.revid+'" onclick="igloo.recentChanges.load(\''+me.pageTitle.replace ('\'', '\\\'')+'\', \''+revision.user+'\', \''+revision.ids.revid+'\');" onmouseover="this.style.backgroundColor = \''+jin.Colour.LIGHT_GREY+'\';" onmouseout="this.style.backgroundColor = \''+jin.Colour.WHITE+'\';" style="cursor: pointer; width: 186px; padding: 2px; border-bottom: 1px solid #000000; list-style-type: none; list-style-image: none; marker-offset: 0px; background-color: '+jin.Colour.WHITE+';">'+revision.user+'</li>';
			}
			
			pageHistory += '<li style="width: 100%; list-style-type: none; list-style-image: none; text-align: center;"><a target="_blank" href="'wgServer + wgScript + '?title=' + me.pageTitle + '&action=history">- full history -</a></li>';
			document.getElementById('igloo-hist-cont').innerHTML = pageHistory;
 
			break;
	}
};

iglooHist.prototype.stop = function  () {
	document.getElementById('igloo-hist-display').style.display = 'none';
 	document.getElementById('igloo-hist-catcher').style.display = 'none';
};

//Class iglooReversion- sets up iglooRollback
function iglooReversion () {
	//Temporary- overwritten on a new diff load
	this.pageTitle = '';
	this.revId = -1;
	this.user = '';
	this.rollback;
	this.reversionEnabled = 'yes';

	//Receives info for new diff
	var me = this;
	igloo.hookEvent('rollback', 'new-diff', function (data) {
		me.pageTitle = data.pageTitle;
		me.revId = data.revId;
		me.user = data.user;
		me.reversionEnabled = 'yes';
		me.rollback = new iglooRollback(data.pageTitle, data.user, data.revId);
	});
}

iglooReversion.prototype.buildInterface = function () {
	var revertButton = document.createElement('div'), me = this;

	revertButton.innerHTML = '<img src= "' + iglooUserSettings.serverLoc + 'images/igloo-revert.png">';

	$(revertButton).click(function () {
		if (me.pageTitle !== '') {
			me.rollback.go();
		}
	});

	$(revertButton).css({
		'position': 'relative',
		'float': 'left',
		'width': '73px',
		'height': '73px',
		'margin-top': '17px',
		'margin-left': '5px',
		'cursor': 'pointer',
	});

	igloo.toolPane.panel.appendChild(revertButton);
};

//class iglooRollback - does Rollback
function iglooRollback (page, user, revId) {
	this.pageTitle = page;
	this.revId = revId;
	this.revertUser = user;
	this.isIp;

	this.lastRevertedRevision = false;
	this.revertedPage = false;
	this.warnWho = false;
	this.warningLevel = false;

	// check whether this user is an IP address, or a registered user
	if ( this.revertUser.match ( /^[0-9]+\.[0-9]+\.[0-9]+\.?[0-9]*$/i ) !== null ) { 
		this.isIp = true; 
		this.checked = { 'auto': '','talk': '','anon': 'checked','email': '','create': 'checked' }; 
	} else { 
		this.isIp = false; 
		this.checked = { 'auto': 'checked','talk': '','anon': '','email': '','create': 'checked' }; 
	}
}

iglooRollback.prototype.go = function () {
	// checks
	if ( this.revertUser === wgUserName ) {
		//igloo.iglooControls.getPermission ( 'You are attempting to revert yourself. Ensure you wish to perform this action. igloo will not warn or report users who are reverting themselves.', function ( thisRevert ) { thisRevert.performRollback ( 0, 'cont' ); } ); 
	} else if ( igloo.currentView.changedSinceDisplay === true ) {
		//igloo.iglooControls.getPermission ( 'The page you are viewing has changed since it was first loaded. Ensure that the change you were reverting has not already been fixed.', function ( page, user ) { thisRevert.performRollback ( page, user ); } ); 
	} else { 
		this.performRollback ( this.pageTitle, this.revertUser ); 
	}
};

iglooRollback.prototype.performRollback = function ( callback, details ) {
	var thisRevert 	= this;
	switch ( callback ) {
		default: case 0:
			// check that reversion is switched on
			if ( igloo.justice.reversionEnabled === 'no' ) { 
				alert ( 'You cannot revert this edit to ' + this.pageTitle + ', because you made it using igloo' );  
				return false; 
			}

			if ( igloo.justice.reversionEnabled === 'pause' ) { 
				alert ( 'You cannot revert this edit to ' + this.pageTitle + ', because a diff is still loading' ); 
				return false; 
			}
					
			// notify user
			igloo.statusLog.addStatus ( 'Attempting to revert the change to <strong>' + thisRevert.pageTitle + '</strong> made by <strong>' + thisRevert.revertUser + '</strong>...' );

			// prevent interference with this page while we are reverting it
			igloo.justice.reversionEnabled = 'pause';
					
			// let the user know we're working...
			document.getElementById ( 'iglooPageTitle' ).innerHTML = document.getElementById ( 'iglooPageTitle' ).innerHTML + ' - reverting edit...';

			// build the reversion summary
			var summary = iglooUserSettings.rollbackSummary;
					
			// attempt the actual rollback
			var thisReversion = new iglooRequest({
				module: 'rollback',
				params: { targ: thisRevert.pageTitle, user: thisRevert.revertUser, summary: summary },
				callback: function ( data ) { thisRevert.performRollback ( 1, data ); }
			}, 0, true, true);
			thisReversion.run();

			break;
					
		case 1:
			if ( details === false ) {
				igloo.statusLog.addStatus ( 'Will not revert the edit to <strong>' + thisRevert.pageTitle + '</strong> by <strong>' + thisRevert.revertUser + '</strong> because another user has already done so.' );
				if ( this.pageTitle === igloo.justice.pageTitle ) {
					igloo.justice.reversionEnabled = 'no';

				}
			} else {
				thisRevert.performRollback ( 2, details );
			}

			break;

		case 2:

			// notify user
			igloo.statusLog.addStatus ( 'Successfully reverted the change to <strong>' + thisRevert.pageTitle + '</strong> made by <strong>' + thisRevert.revertUser + '</strong>!' );

			this.warnUser();
			
			break;
	}
};
		
iglooRollback.prototype.warnUser = function( callback, details ) {
	var thisRevert = this;

	switch ( callback ) {
		default: case 0:
			// don't warn self
			if ( thisRevert.revertUser === wgUserName ) {
				document.getElementById ( 'iglooPageTitle' ).innerHTML = thisRevert.pageTitle;
				break;
			}

			document.getElementById ( 'iglooPageTitle' ).innerHTML = thisRevert.pageTitle + ' - warning user';

			// notify user
			igloo.statusLog.addStatus( 'Attempting to warn <strong>' + thisRevert.revertUser + '</strong> for vandalism on <strong>' + thisRevert.pageTitle + '</strong>...' );

			// get the user talk page
			var getUserPage = new iglooRequest({
				module: 'getPage',
				params: { targ: 'User_talk:' + thisRevert.revertUser, revisions: 1, properties: 'content' },
				callback: function ( data ) { thisRevert.warnUser ( 1, data ); }
			}, 0, true, true);
			getUserPage.run();
			
			break;

		case 1:
			// set up the time management systems
			var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var currentDate = new Date ();
			var currentMonth = currentDate.getMonth ();
			var currentYear = currentDate.getFullYear ();
			var currentTime = currentDate.getTime ();
			var header;
					
			// check for warnings on the user's talk page
			var warnings = [];

			// if the page already exists, we must analyse it for warnings
			if ( details !== false ) {
				var pageData = details[0].content;
				var regTest = /<!-- ?(?:template:?)?uw-([a-z]+?)([0-9](?:im)?)? ?-->(?:.+?([0-9]{2}):([0-9]{2}), ([0-9]{1,2}) ([a-z]+?) ([0-9]{4}))?/gi;

				// get all the warnings on the page
				var i = 0;

				while ( true ) {
					var t = regTest.exec ( pageData );
					if ( t == null ) break;
					warnings[i] = [];
					warnings[i][0] = t[1]; // template
					warnings[i][1] = t[2]; // level
					warnings[i][2] = t[3]; // hour
					warnings[i][3] = t[4]; // minute
					warnings[i][4] = t[5]; // day
					warnings[i][5] = t[6]; // month
					warnings[i][6] = t[7]; // year

					i ++;
				}

				// we are only interested in the latest one
				if ( typeof warnings[0] == 'undefined' ) { warnings[0] = []; warnings[0][0] = false; warnings[0][1] = 0; }
				var useWarning = warnings.length-1;

				if ( typeof warnings[useWarning][0] === 'string' ) {
					var t = warnings[useWarning][0];
					if ( t.indexOf ( 'block' ) > -1 ) { useWarning --; warnings[useWarning][1] = 0; }
				}
						
				// check when this warning was given
				for ( var compareMonth = 0; compareMonth < months.length; compareMonth ++ ) {
					if ( months[compareMonth] === warnings[useWarning][5] ) break;
				}
						
				var compareDate = new Date ();
					compareDate.setFullYear ( parseInt ( warnings[useWarning][6] ), compareMonth, parseInt ( warnings[useWarning][4] ) );
					compareDate.setHours ( parseInt ( warnings[useWarning][2] ) );
					compareDate.setMinutes ( parseInt ( warnings[useWarning][3] ) );
						
				var compareTime = compareDate.getTime ();
						
				// check if it is old enough to ignore for the purposes of incremental warnings
				var timeDiff = ( currentTime + ( currentDate.getTimezoneOffset () * 60 * 1000 ) ) - compareTime;
				if ( timeDiff > ( iglooUserSettings.warningsOldAfter * 24 * 60 * 60 * 1000 ) ) { warnings[useWarning][1] = 0; }
					
				// check whether a header already exists for the current month. if not, create one
				var currentHeader = new RegExp ( '={2,4} *' + months[currentMonth] + ' *' + currentYear + ' *={2,4}', 'gi' );
				if ( currentHeader.test ( pageData ) != true ) { header = '== '+months[currentMonth]+' '+currentYear+' =='; } else { header = false; }
			} else {
				// if the page does not  exist, we can simply set warnings at the default (lowest) levels
				// set up the warning and date header for addition to the user's page
				warnings[0] = []; warnings[0][0] = false; warnings[0][1] = 0;
				var useWarning = 0;
				header = '== '+months[currentMonth]+' '+currentYear+' ==';
			}
					
			// decide upon which warning level to issue
			var currentWarning = parseInt(warnings[useWarning][1])
			if (currentWarning === 4 ) {
				igloo.statusLog.addStatus ( 'Will not warn <strong>' + thisRevert.revertUser + '</strong> because they have already recieved a final warning.' );
				this.reportUser ();
				this.warningLevel = false
			} else if (currentWarning < 4 && currentWarning > 0) {
				this.warningLevel = currentWarning + 1;
			} else {
				this.warningLevel = 1
			}
					
			// add the message to their talk page
			if (this.warningLevel === false) return false;
					
			var userPage = 'User_talk:' + this.revertUser;
			var message = iglooUserSettings.warningMessage;
				message = message.replace ( /%LEVEL%/g, this.warningLevel );
				message = message.replace ( /%PAGE%/g, this.pageTitle );
				message = message.replace ( /%DIFF%/g, wgServer + wgScript + '?diff=' + this.revId + '' );
				message = message.replace ( /%MESSAGE%/g, iglooUserSettings.vandalTemplate );
			var summary = iglooUserSettings.warningSummary;
				summary = summary.replace ( /%LEVEL%/g, this.warningLevel );
				summary = summary.replace ( /%PAGE%/g, this.pageTitle );
				
			if ( header != false ) message = '\n' + header + '\n' + message;

			var userReport = new iglooRequest({
				module: 'edit',
				params: { targ: userPage, isMinor: false, text: message, summary: summary, where: 'appendtext' },
				callback: function ( data ) {
					console.log("HEEERREE");
					if ( iglooUserSettings.notifyWarningDone === true )
						igloo.statusLog.addStatus( 'Successfully issued a level <strong>' + thisRevert.warningLevel + '</strong> warning to <strong>' + thisRevert.revertUser + '</strong> for vandalism on <strong>' + thisRevert.pageTitle + '</strong>!' ); 
				}
			}, 0, true, true);
			userReport.run();
			document.getElementById ( 'iglooPageTitle' ).innerHTML = thisRevert.pageTitle;
	}
};
		
iglooRollback.prototype.reportUser = function( callback, details ) {
	var thisRevert = this;

	// handle reporting of the user to AIV
	switch ( callback ) {
		default: case 0:
			document.getElementById ( 'iglooPageTitle' ).innerHTML = thisRevert.pageTitle + ' - warning user';

			// notify user
			igloo.statusLog.addStatus ( 'Attempting to report <strong>' + thisRevert.revertUser + '</strong> to <strong>' + iglooUserSettings.aiv + '</strong> for vandalism after final warning...' );
		
			// get the aiv page
			var getAivPage = new iglooRequest({
				module: 'getPage',
				params: { targ: iglooUserSettings.aiv.replace ( / /g, '_' ), revisions: 1, properties: 'content' },
				callback: function ( data ) { thisRevert.reportUser ( 1, data ); }
			}, 0, true, true);
			getAivPage.run();

			break;
					
		case 1:
			// check whether they are already reported
			if ( details === false ) {
				igloo.statusLog.addStatus ( 'Will not report <strong>' + thisRevert.revertUser + '</strong> because the report page does not appear to exist.' );
				return false; // error
			}
			var pageData = details[0].content;
					
			if ( pageData.indexOf ( '|' + thisRevert.revertUser + '}}' ) > -1 ) {
				igloo.statusLog.addStatus ( 'Will not report <strong>' + thisRevert.revertUser + '</strong> because they have already been reported.' );
				return false; // error
			}
					
			// build page link
			var aivLink = iglooUserSettings.aiv.replace ( / /g, '_' );
					
			// build the report
			var myReport = iglooUserSettings.aivMessage;

			if ( thisRevert.isIp === true ) { 
				myReport = myReport.replace ( /%TEMPLATE%/g, iglooUserSettings.aivIp ); 
			} else { 
				myReport = myReport.replace ( /%TEMPLATE%/g, iglooUserSettings.aivUser ); 
			}
			myReport = myReport.replace ( /%USER%/g, thisRevert.revertUser );
					
			// build the summary
			var mySummary = iglooUserSettings.aivSummary;
			mySummary = mySummary.replace ( /%USER%/g, thisRevert.revertUser );
					
			// perform the edit
			var userReport = new iglooRequest({
				module: 'edit',
				params: { targ: aivLink, isMinor: false, text: myReport, summary: mySummary, where: iglooUserSettings.aivWhere },
				callback: function ( data ) { igloo.statusLog.addStatus ( 'Successfully reported <strong>' + thisRevert.revertUser + '</strong> to AIV!' ); }
			}, 0, true, true);
			userReport.run();

			document.getElementById ( 'iglooPageTitle' ).innerHTML = thisRevert.pageTitle;

			break;
	}
};

iglooRollback.prototype.revert = function () {
	var pop = new iglooPopup('asdasd');
	pop.show();
	console.log('IGLOO REVERT: PAGE: ' + this.pageTitle + ' USER: ' + this.user + 'REV: ' + this.revId);
};

//iglooPopup - creates a Popup
function iglooPopup (content) {
	this.popupMenu = document.createElement('div');
	this.popupMenuContent = document.createElement('div'); 
	
	$(this.popupMenu).css({
		'opacity' : 0.7,
		'background-color': jin.Colour.BLACK,
		'display': 'none',
		'position': 'fixed',
		'top': '0px',
		'left': '0px',
		'cursor': 'auto',
		'z-index': 99998
	});

	$(this.popupMenuContent).css({
		'background-color': jin.Colour.LIGHT_GREY,
		'position': 'absolute',
		'width': '800px',
		'height': '400px',
		'padding': '0px',
		'display': 'none',
		'border': '1px solid rgb(0, 0, 0)',
		'z-index': 99999
	});

	this.popupMenuContent.innerHTML = '<div>' + content + '</div>';
	this.center();

	igloo.canvas.canvasBase.children[0].appendChild(this.popupMenuContent);
	igloo.canvas.canvasBase.children[0].appendChild(this.popupMenu);
}

iglooPopup.prototype.center = function () {
	var screenWidth = parseInt(igloo.canvas.canvasBase.children[0].style.width);
	var screenHeight = parseInt(igloo.canvas.canvasBase.children[0].style.height);
	var myWidth = parseInt($(this.popupMenuContent).css('width'));
	var myHeight = parseInt($(this.popupMenuContent).css('height'));
 
	var leftPos	= ((screenWidth / 2) - (myWidth / 2));
	var topPos	= ((screenHeight / 2) - (myHeight / 2));
	var me = this;
 
	$(this.popupMenuContent).css({
		'left': leftPos + 'px',
		'top':  topPos + 'px'
	});
 
	if (window.addEventListener) {
		window.addEventListener('resize', function() {  
			me.center();
		}, false);
	} else {
		window.attachEvent('onresize', function() {  
			me.center();
		});
	}
};

iglooPopup.prototype.show = function () {
	$(this.popupMenu).css({'display': 'block'});
	$(this.popupMenuContent).css({'display': 'block'});
};

iglooPopup.prototype.hide = function () {
	$(this.popupMenu).remove();
	$(this.popupMenuContent).remove();
};

//iglooStatus- Displays and maintains a log of igloo's actions
function iglooStatus () {
	this.idCounter = 1;
 
	this.buildInterface = function() {
		this.display = document.createElement('div');

		this.display.innerHTML = '<div id="iglooStatusDisplay" style="width: 100%; height: 100%; overflow: auto; font-size: 12px;"><div id="statusObj_0" class="statusObj">Welcome to igloo! This is your status window, where you see the actions that igloo is taking on your behalf.<br /></div>';

		$(this.display).css({
			'left': '0px',
			'top': (parseInt(igloo.canvas.canvasBase.children[0].style.height) - 255) + 'px',	
			'width': '100%',
			'height': '140px',
			'background-color': jin.Colour.LIGHT_GREY,
			'border-top': '1px solid #000000',
			'padding': '5px',
			'overflow': 'visible',
			'z-index': 99997,
			'display': 'block',
			'position': 'absolute'
		});

 		igloo.content.panel.appendChild(this.display);
	}

	this.addStatus = function(message) {
		var curDate = new Date(), sec, mins, hours, dateString;
				
		sec = curDate.getSeconds();
		mins = curDate.getMinutes();
		hours = curDate.getHours();

		if ( sec < 10 ) sec = '0' + sec;
		if ( mins < 10 ) mins = '0' + mins;
		if ( hours < 10 ) hours = '0' + hours;
			
		dateString = hours + ':' + mins + ':' + sec;
 
		var statusId = this.idCounter; 
		this.idCounter++;
 
		var newStatus = document.createElement('div');
		newStatus.id = 'statusObj_' + statusId;
		newStatus.className = 'statusObj';
		newStatus.innerHTML = '<span>' + dateString + ' - ' + message + '</span>';
 
		var statusObj = document.getElementById('iglooStatusDisplay');
		statusObj.insertBefore(newStatus, statusObj.firstChild);
 
		return statusId;
	};
}

//Class iglooRequest- sends a request to API
function iglooRequest (request, priority, important, flash) {
	var me = this;
	
	// Statics
	getp(this).requests = [];
	getp(this).queuedRequests = 0;
	getp(this).runningRequests = 0;

	// Constructor
	this.request = request;
	this.priority = priority;
	this.important = important;
	this.requestItem = null;

	if (typeof flash != "undefined" && flash == true) {
		this.flash = flash;
	} else {
		this.flash = false;
	}
}

iglooRequest.prototype.run = function () {
	var me = this;

	if (this.important === true) {
		// If important, execute immediately.
		if (this.flash === true) {
			Flash(this.request.module).load(this.request.params).wait(this.request.callback).run();
		}
		this.requestItem = $.ajax(this.request);
		return this.requestItem;
	} else {
		// If not important, attach our callback to its complete function.
		if (this.request.complete) {
			var f = this.request['complete'];
			this.request['complete'] = function (data) { me.callback(); f(data); };
		} else {
			this.request['complete'] = function (data) { me.callback(); };
		}
		
		// If we have enough requests, just run, otherwise hold.
		if (getp(this).runningRequests >= iglooUserSettings.limitRequests) {
			console.log('IGLOO: queuing a request because ' + getp(this).runningRequests + '/' + iglooUserSettings.limitRequests + ' are running');
			
			getp(this).requests.push(this.request);
			getp(this).requests.sort(function (a, b) { return a.priority - b.priority; });
			
			if (getp(this).queuedRequests > 20) {
				console.log('IGLOO: pruned an old request because the queue contains 20 items');
				getp(this).requests = getp(this).requests.slice(1);
			} else {
				getp(this).queuedRequests++;
			}
		} else {
			console.log ( 'IGLOO: running a request because ' + getp(this).runningRequests + '/' + iglooUserSettings.limitRequests + ' are running' );
			getp(this).runningRequests++;
			this.requestItem = $.ajax(this.request);
			return this.requestItem;
		}
	}
};

iglooRequest.prototype.abort = function () {
	if (this.requestItem !== null) {
		this.requestItem.abort();
		this.requestItem = null;
	} else {
		this.requestItem = null;
	}
};

iglooRequest.prototype.callback = function () {
	getp(this).runningRequests--;
	
	if (getp(this).queuedRequests > 0) {
		console.log('IGLOO: non-important request completed, running another request, remaining: ' + getp(this).queuedRequests);
		
		var request = null;
		while (request === null) {
			request = getp(this).requests.pop();
			getp(this).queuedRequests--;
		}

		if (request !== undefined) {
			getp(this).runningRequests++;
			$.ajax(request);
		}
	} else {		
		console.log ( 'IGLOO: non-important request completed, but none remain queued to run' );
	}
};




/*
	COMPLETE ==========================
	*/
// MAIN
if (!igloo)
	var igloo = new iglooMain();
	
if (typeof jin === 'undefined') {
	tIgLa = function () {
		if (typeof jin === 'undefined') {
			setTimeout(tIgLa, 1000);
		} else {
			igloo.launch();
		}
	};
	setTimeout(tIgLa, 1000);
} else {
	igloo.launch();
}

Array.prototype.iglast = function () {
	return this[this.length - 1];
};

igloo.announce('core');