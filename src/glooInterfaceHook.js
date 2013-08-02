/* ======================================================== *\
** 			igloo frontend manager - interface hook
\* ======================================================== */

// The igloo interface hook is aware of where a user is, and will
// start igloo and perform the required functions on the correct 
// pages. It also powers the 'Start igloo' button functionality.

	function iglooHookInterface() {
		this.run = function() {
			// igloo functionality
			if (wgPageName == iglooSettings.localBase + 'init') {
				// the init page handles starting the program and operating settings.
				// call init.
				iglooImport('User:Ale_jrb/Scripts/iglooInit.js');
			} 
			else if (wgPageName == iglooSettings.localBase + 'run') {
				// the main page handles starting the general program.
				iglooImport('User:Ale_jrb/Scripts/iglooMain.js');
			} else {
				var iglooDivs = document.getElementsByTagName('div');
				var iglooUrl = wgServer + wgArticlePath.substr(0, wgArticlePath.length - 2) + iglooSettings.localBase + 'init';
				var iglooWindowOpen = function() { window.open(iglooUrl, 'igloo', 'toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizeable=0,width='+window.screen.availWidth+',height='+window.screen.height-30); }
				
				// check for launch buttons
				if (iglooSettings.hookInterface == true) {
					// hook the mediawiki interface
					var iglooLink = new wa_element('li');
					iglooLink.ele_obj.id = 't-igloo';
					iglooLink.ele_obj.innerHTML = '<a id="igloo-goto-menu" href="javascript:return false;" title="igloo">igloo</a> | <a id="igloo-do-launch" href="javascript:return false;" title="launch igloo">(launch)</a>';
					 
					var parent = document.getElementById('p-tb');
					parent.childNodes[3].childNodes[1].insertBefore(iglooLink.ele_obj, parent.childNodes[3].childNodes[1].firstChild);
					
					wa_attach ( document.getElementById ( 'igloo-goto-menu' ), 'click', function() { window.location = iglooSettings.articleBase + iglooSettings.localBase.substr(0, iglooSettings.localBase.length - 1); } );
					wa_attach ( document.getElementById ( 'igloo-do-launch' ), 'click', iglooWindowOpen );
				}
				
				for ( var i = 0; i < iglooDivs.length; i++ ) {
					if ( iglooDivs[i].className == 'iglooNotInstalled' ) {
						iglooDivs[i].style.display = 'none';
					} else if ( iglooDivs[i].className == 'iglooLaunch' ) {
						// build button
						iglooDivs[i].style.margin = 'auto';
						iglooDivs[i].style.width = '150px';
						iglooDivs[i].style.border = '1px solid #bbbbff';
						iglooDivs[i].style.backgroundColor = '#fdfdff';
						iglooDivs[i].style.color = '#555588';
						iglooDivs[i].style.fontSize = '1.35em';
						iglooDivs[i].style.fontWeight = 'bold';
						iglooDivs[i].style.textAlign = 'center';
						iglooDivs[i].style.cursor = 'pointer';
						iglooDivs[i].innerHTML = 'launch igloo';
						
						if (iglooDivs[i].addEventListener) {
							iglooDivs[i].addEventListener('click', iglooWindowOpen, true);
						} else {
							iglooDivs[i].attachEvent('onclick', iglooWindowOpen);
						}
					} else if ( iglooDivs[i].className == 'iglooSlimLaunch' ) {
						if (iglooDivs[i].addEventListener) {
							iglooDivs[i].addEventListener('click', iglooWindowOpen, true);
						} else {
							iglooDivs[i].attachEvent('onclick', iglooWindowOpen);
						}
					}
				}
			}
		}
		
		this.run();
	}
	
	
	hookEvent('load', iglooHookInterface);