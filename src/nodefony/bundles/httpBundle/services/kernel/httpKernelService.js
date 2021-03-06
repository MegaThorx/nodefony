/*
 *
 *
 *
 *
 *
 */
var Url = require("url");

nodefony.registerService("httpKernel", function(){

	/*
 	 *
 	 *	HTTP KERNEL
 	 *
 	 *
 	 */
	var httpKernel = function(container, serverStatic ){
		this.container = container ;
		this.kernel = this.container.get("kernel");
		this.reader = this.container.get("reader");
		this.serverStatic = serverStatic;
		this.engineTemplate = this.container.get("templating");
		//this.settings =  this.container.getParameters("bundles.http");

		this.container.addScope("request");
		this.kernel.listen(this, "onServerRequest" , function(request, response, type, domain){
			try {
				this.handle(request, response, type, domain);
			}catch(e){
				throw e
			}
		});
		this.firewall = null ;
		this.kernel.listen(this, "onReady", function(){
			this.firewall = this.get("security") ;
		});
		// listen KERNEL EVENTS
		this.kernel.listen(this, "onBoot",function(){
			this.sessionService = this.get("sessions");
			this.compileAlias();
		});

		this.kernel.listen(this, "onClientError", function(e, socket){
			this.logger(e, "ERROR", "HTTP KERNEL SOCKET CLIENT ERROR")
		});
	};

	httpKernel.prototype.boot = function(){
		 /*this.kernel.listen(this, "onBoot", function(){
		 });*/
	};

	httpKernel.prototype.compileAlias = function(){

		try {
			var alias = [] ;
			if ( this.kernel.domainAlias && typeof this.kernel.domainAlias === "string" ){
				var alias = this.kernel.domainAlias.split(" ");
				Array.prototype.unshift.call(alias,  "^"+this.kernel.domain+"$" );
				var str = "";
				for ( var i = 0 ; i <alias.length ;i++ ){
					if (i === 0) 
						str = alias[i];
					else
						str += "|"+ alias[i] ;
				}
				if (str){
					this.regAlias = new RegExp(str);
				}

			}else{
				this.logger("Config file bad format for domain alias ", "ERROR", "HTTP KERNEL DOMAIN");	
			}
		}catch(e){
			throw e ;
		}
	}

	httpKernel.prototype.isDomainAlias = function(host){
		return this.regAlias.test(host);
	}

	
	httpKernel.prototype.getEngineTemplate = function(name){
		return nodefony.templatings[name];
	};

	httpKernel.prototype.getView = function( name ){
		var tab = name.split(":");
		var bundle = tab[0] ;
		var controller = tab[1] || ".";
		var action = tab[2];
		bundle = this.kernel.getBundle( this.kernel.getBundleName(bundle) );
		if (! bundle ){
			throw new Error("BUNDLE :" + bundle +"NOT exist")
		}
		try {
			return bundle.getView(controller, action);
		}catch (e){
			throw e;	
		}
	};
	httpKernel.prototype.getTemplate = function( name ){
		var tab = name.split(":");
		var bundle = tab[0] ;
		var controller = tab[1] || ".";
		var action = tab[2];
		bundle = this.kernel.getBundle( this.kernel.getBundleName(bundle) );
		if (! bundle ){
			throw new Error("BUNDLE :" + bundle +"NOT exist")
		}
		try {
			return bundle.getTemplate(controller, action);
		}catch (e){
			throw e;	
		}
	};

	httpKernel.prototype.initTemplate = function(){
		var classTemplate = this.getEngineTemplate(this.settings.templating);
		this.templating = new classTemplate(this.container, this.settings[this.settings.templating]);
		this.set("templating", this.templating );
	};

	httpKernel.prototype.logger = function(pci, severity, msgid,  msg){
		var syslog = this.container.get("syslog");
		if (! msgid) msgid = "HTTP KERNEL ";
		return syslog.logger(pci, severity, msgid,  msg);
	};

	httpKernel.prototype.onError = function(container, error){
		if ( ! error ){
 		       	error = {status:500,
				message:"nodefony undefined error "
			}
		}else{
			if ( error.stack ){
				var myError =  error.stack;
				this.logger(myError);
				myError = myError.split('\n').map(function(v){ return ' -- ' + v +"</br>"; }).join('');
            				
			}else{
				var myError =  error;
				this.logger(util.inspect(error));
			}
		}
		var context = container.get('context');
		switch (error.status){
			case 404:
				var resolver = container.get("router").resolveName(container, "frameworkBundle:default:404");
			break;
			case 401:
				var resolver = container.get("router").resolveName(container, "frameworkBundle:default:401");
			break;
			case 403:
				var resolver = container.get("router").resolveName(container, "frameworkBundle:default:403");
			break;
			case 408:
				var resolver = container.get("router").resolveName(container, "frameworkBundle:default:timeout");
			break;
			default:
				var resolver = container.get("router").resolveName(container, "frameworkBundle:default:exceptions");
		}
		context.response.setStatusCode(error.status || 500 ) ;

		if (error.xjson){
			if ( context.setXjson ) 
				context.setXjson(error.xjson);
		}
		resolver.callController( {
			exception:myError || error,
			Controller: container.get("controller") ? container.get("controller").name : null,
			bundle:container.get("bundle") ? container.get("bundle").name : null
		} );
	};

	httpKernel.prototype.onErrorWebsoket = function(container, error){
		if ( ! error ){
 		       	error = {status:500,
				message:"nodefony undefined error "
			}
		}else{
			if ( error.stack ){
				var myError =  error.stack;
				this.logger(myError);
				myError = myError.split('\n').map(function(v){ return ' -- ' + v +"</br>"; }).join('');
            				
			}else{
				var myError =  error;
				this.logger(util.inspect(error));
			}
		}
		var context = container.get('context');
	}

	var controller = function(pattern, data){
		try {
			var router = this.get("router");
			var resolver = router.resolveName(this, pattern) ;

			var myController = new resolver.controller( this, resolver.context );
			if ( data ){
				Array.prototype.shift.call( arguments );
				for ( var i = 0 ; i< arguments.length ; i++){
					resolver.variables.push(arguments[i]);	
				}
				//resolver.variables.push(data); 
			}
			return resolver.action.apply(myController, resolver.variables);
		}catch(e){
			this.logger(e, "ERROR")
			//throw e.error
		}	
	};

	var render = function(response){
		switch (true){
			case response instanceof nodefony.Response :
				return response.body;
			break ;
			case response instanceof nodefony.wsResponse :
				return response.body;
			break ;
			case response instanceof Promise :
				return response;
			break ;
			case nodefony.typeOf(response) === "object":
				return nodefony.extend(true , this, response);
			break;
			default:
				return response ;
		}
	}

	//  build response
	httpKernel.prototype.handle = function(request, response, type, domain){

		// SCOPE REQUEST ;
		var container = this.container.enterScope("request");	
		if ( domain ) domain.container = container ;

		//I18n
		var translation = new nodefony.services.translation( container, type );
		container.set("translation", translation );

		
		switch (type){
			case "HTTP" :
			case "HTTPS" :
				var context = new nodefony.io.transports.http(container, request, response, type);
				container.set("context", context);
				
				//request events	
				context.notificationsCenter.listen(this, "onError", this.onError);
				
				var resolver  = this.get("router").resolve(container, request);
				if (resolver.resolve) {
					context.resolver = resolver ;	
				}else{
					var error = new Error("Not Found", 404);	
					return context.notificationsCenter.fire("onError", container, {
						status:404,
						error:"URI :" + request.url,
						message:"not Found"
					});
				}

				if ( request.headers["x-forwarded-for"] ){
					//console.log(request.headers)
					if ( request.headers["x-forwarded-proto"] ){
						context.type = request.headers["x-forwarded-proto"].toUpperCase();
					}
					context.proxy = {
						proxyServer	: request.headers["x-forwarded-server"],	
						proxyProto	: request.headers["x-forwarded-proto"],
						proxyPort	: request.headers["x-forwarded-port"],
						proxyFor	: request.headers["x-forwarded-for"],
						proxyHost	: request.headers["x-forwarded-host"],	
						proxyVia	: request.headers["via"] 
					}
					this.logger( "PROXY REQUEST x-forwarded VIA : " + context.proxy.proxyVia , "DEBUG");
					//var protocole = type.toLowerCase()+"://" ;
					//var destURL = protocole+context.proxy.proxyHost+":"+port ;
				}

				this.kernel.fire("onHttpRequest", container, context, type);
				//twig extend context
				context.extendTwig = {
					render:render,
					controller:controller.bind(container),
					trans:translation.trans.bind(translation),
					getLocale:translation.getLocale.bind(translation),
					trans_default_domain:function(){
						translation.trans_default_domain.apply(translation, arguments) ;
					},
					getTransDefaultDomain:translation.getTransDefaultDomain.bind(translation)
				}

				//response events	
				context.response.response.on("finish",function(){
					context.fire("onFinish", context);
					this.container.leaveScope(container);
					//if ( ! context.session  ){
						delete context.extendTwig ;
						if (context.proxy) delete context.proxy ;
						context.clean();
						delete context;	
						delete request ;
						delete response ;
					//}
					
					//if (context.profiling) delete context.profiling ;
					delete container ;
					delete translation ;
					if (domain) {
						//domain.return(context);
						delete domain.container ;
						delete domain ;
					}
				}.bind(this));

				if (! this.firewall){
					request.on('end', function(){
						try {
							if ( context.sessionAutoStart === "autostart" ){
					 			this.sessionService.start(context, "default", function(err, session){
						 			if (err){
										throw err ;
						 			}
									this.logger("AUTOSTART SESSION","DEBUG")
									context.notificationsCenter.fire("onRequest",container, request, response );	
					 			}.bind(this));
							}else{
								context.notificationsCenter.fire("onRequest",container, request, response );	
							}
						}catch(e){
							context.notificationsCenter.fire("onError", container, e );	
						}
					}.bind(this));
					return ;	
				}
			break;
			case "WEBSOCKET" :
			case "WEBSOCKET SECURE" :
				var context = new nodefony.io.transports.websocket(container, request, response, type);
				container.set("context", context);
				context.notificationsCenter.listen(this, "onError", this.onErrorWebsoket);	

				var resolver  = this.get("router").resolve(container, request);
				if (resolver.resolve) {
					context.resolver = resolver ;	
				}else{
					var error = new Error("Not Found", 404);	
					return context.notificationsCenter.fire("onError", container, {
						status:404,
						error:"URI :" + request.url,
						message:"not Found"
					});
				}

				this.kernel.fire("onWebsocketRequest", container, context, type);
				//twig extend context
				context.extendTwig = {
					render:render.bind(container),
					controller:controller.bind(container),
					trans:translation.trans.bind(translation),
					getLocale:translation.getLocale.bind(translation),
					trans_default_domain:function(){
						translation.trans_default_domain.apply(translation, arguments) ;
					},
					getTransDefaultDomain:translation.getTransDefaultDomain.bind(translation)
				}
				context.listen(this,"onClose" , function(reasonCode, description){
					context.fire("onFinish", context, reasonCode, description);
					delete 	context.extendTwig ;
					context.clean();
					delete context ;
					if (domain) {
						delete domain.container ;
						delete domain ;
					}
					//if (context.profiling) delete context.profiling ;
					delete container ;
					delete translation ;
					delete request ;
					delete response ;
				});
				if (! this.firewall){
					try {
						if ( context.sessionAutoStart === "autostart" ){
					 		this.sessionService.start(context, "default", function(err, session){
						 		if (err){
									throw err ;
						 		}
								this.logger("AUTOSTART SESSION","DEBUG")
								context.notificationsCenter.fire("onRequest",container, request, response );	
					 		}.bind(this));
						}else{
							context.notificationsCenter.fire("onRequest",container, request, response );	
						}
					}catch(e){
						context.notificationsCenter.fire("onError", container, e );	
					}
					return ;	
				}
			break;
		}
		this.kernel.fire("onSecurity", context);
	};

	return httpKernel ;
});
