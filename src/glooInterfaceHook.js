/* ======================================================== *\
** 			igloo frontend manager - interface hook
\* ======================================================== */

// The igloo interface hook is aware of where a user is, and will
// start igloo and perform the required functions on the correct 
// pages. It also powers the 'Start igloo' button functionality.

	function iglooHookInterface() {
		this.run = function() {
			// igloo functionality
			if (mw.config.get('wgPageName') === 'User:Ale_jrb/igDev') {
				// the init page handles starting the program and operating settings.
				// call init.
				iglooImport('User:Ale_jrb/Scripts/iglooInit.js');
			} else {
				var iglooDivs = document.getElementsByTagName('div');
				
				// check for launch buttons
				if (iglooSettings.hookInterface == true) {
					// hook the mediawiki interface
					var iglooLink = document.createElement('li');
					iglooLink.id = 't-igloo';
					iglooLink.innerHTML = '<a id="igloo-goto-menu" target="_blank" href="User:Ale_jrb/Scripts/igloo" title="igloo">igloo</a> | <a id="igloo-do-launch" target="_blank" href="User:Ale_jrb/igDev" title="launch igloo">(launch)</a>';
					 
					var parent = document.getElementById('p-tb');
					parent.childNodes[3].childNodes[1].insertBefore(iglooLink, parent.childNodes[3].childNodes[1].firstChild);
				}
				
				for ( var i = 0; i < iglooDivs.length; i++ ) {
					if ( iglooDivs[i].className == 'iglooNotInstalled' ) {
						iglooDivs[i].style.display = 'none';
					} else if ( iglooDivs[i].className == 'iglooLaunch' ) {
						// build button
						iglooDivs[i].style.margin = 'auto';
						iglooDivs[i].style.width = '150px';
						iglooDivs[i].style.border = '1px solid ' + jin.Colour.DARK_GREY;
						iglooDivs[i].style.backgroundColor = jin.Colour.LIGHT_GREY;
						iglooDivs[i].style.color = jin.Colour.DARK_GREY;
						iglooDivs[i].style.fontSize = '1.35em';
						iglooDivs[i].style.fontWeight = 'bold';
						iglooDivs[i].style.textAlign = 'center';
						iglooDivs[i].style.cursor = 'pointer';
						iglooDivs[i].innerHTML = '<a target="_blank" href="User:Ale_jrb/igDev">launch igloo</a>';
					}
				}
			}
		}
		
		this.run();
	}
	
	
	hookEvent('load', iglooHookInterface);