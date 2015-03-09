var nodefony = function(){

	



	var nativeBind = function(){
		return (!! Function.prototype.bind)  
	}();

	
	if ( ! nativeBind ){
		// bind tools
		var setContext = function(){

			var mergeArg = function(){
				if ( Array.prototype.unshift ){
					return function(tab, args){
						Array.prototype.unshift.apply(tab, args);
					}
				}
				return function(tab, args){
					for ( var i = args.length ; i > 0; i-- ){
						Array.prototype.splice.call(tab, 0, 0, args[i-1] );
					}
				}
			}()
			
			return function(){
				var func = this;
				var context = Array.prototype.shift.call(arguments);
				var args = arguments;
				return function (){
					mergeArg(arguments, args);
					return func.apply(context, arguments)
				}
			}
		}();
		Function.prototype.bind = setContext;
	}

	var listen = function(){
		if(document.addEventListener){
			return function(event, handler, capture){
				this.addEventListener(event, handler, capture || false);
				return handler ;
			}
		}
		return function(event, handler, capture){
			this.attachEvent('on' + event, handler);			
			return handler ;
		}
	}();	



	var trim = function(){
		// inspired  by jquery
		// Used for trimming whitespace
		var trimLeft = /^\s+/ ;
		var trimRight = /\s+$/ ;

		if ( String.prototype.trim )
			return function(text){
				return text == null ?
				"" :
				String.prototype.trim.call(text);
			}
		return function(text){
			return text == null ?
				"" :
				text.toString().replace( trimLeft, "" ).replace( trimRight, "" );
		}
	}();


	// CLASS CSS
	var addClass = function(element, value){
		var classNames = (value || "").split( /\s+/ );
		if ( element.nodeType === 1 ) {
			if ( !element.className ) {
				element.className = value;
			} else {
				var className = " " + element.className + " ", setClass = element.className;
				for ( var c = 0, cl = classNames.length; c < cl; c++ ) {
					if ( className.indexOf( " " + classNames[c] + " " ) < 0 ) {
						setClass += " " + classNames[c];
					}
				}
				element.className = trim( setClass );
			}
		}

	};
	
	var removeClass = function(element, value){
		if ( (value && typeof value === "string") || value === undefined ) {
			var classNames = (value || "").split(/\s+/);
			if ( element.nodeType === 1 && element.className ) {
				if ( value ) {
					var className = (" " + element.className + " ").replace(/[\n\t]/g, " ");
					for ( var c = 0, cl = classNames.length; c < cl; c++ ) {
						className = className.replace(" " + classNames[c] + " ", " ");
					}
					element.className = trim( className );
				} else {
					element.className = "";
				}
			}
		}
	};

	// EVENTS LOAD 
	var load = function(){
		this.debugbar = document.getElementById("nodefony-container");
		this.smallContainer = document.getElementById("nodefony-small");
		this.nodefonyClose = document.getElementById("nodefonyClose");

		this.listen(this.nodefonyClose, "click", function(event){
			//var ev = new coreEvent(event);
			removeClass( this.smallContainer, "hidden" )	
			addClass( this.debugbar, "hidden" )	
			//ev.stopPropagation();
		}.bind(this))

		this.listen(this.smallContainer, "click", function(event){
			//var ev = new coreEvent(event);
			removeClass(  this.debugbar, "hidden" )	;
			addClass( this.smallContainer, "hidden" );
			//ev.stopPropagation();	
		}.bind(this))
	};


	var Nodefony = function(){
		this.listen = function(element, event, handler, capture){
			if (element)
				return 	listen.call(element, event, handler, capture)	
		}; 

		if (window.addEventListener) {
			window.addEventListener("load", load.bind(this) , false);
		} else {
			window.attachEvent("onload", load.bind(this) );
		}	

	};


	return new Nodefony();

}();
