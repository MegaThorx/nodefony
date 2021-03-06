
var net = require('net');
var pm2 = require('pm2');


nodefony.registerService("monitoring", function(){




	var connection = function(socket){
		this.socket = socket ;
		this.id = socket._handle.fd+"_"+socket.server._connectionKey;
		this.readable = socket.readable ;
		this.writable = socket.writable;
	};

	connection.prototype.write = function(data){
		this.socket.write(data);
	};

	var service = function(realTime, container, kernel){
	
		this.realTime = realTime ;
		this.container = container ;
		this.kernel = kernel ;
		this.name ="monitoring" ;
		this.status = "disconnect";
		this.connections= [];
		this.domain = kernel.domain;
		this.port = 1318;
		this.server = null;
		this.syslog = kernel.syslog ;
		if( this.realTime )
			this.createServer();

	};

	service.prototype.logger = function(pci, severity, msgid,  msg){
		if (! msgid) msgid = "SERVICE MONITORING ";
		if ( this.realTime )
			this.realTime.logger(pci, severity,msgid);
		else
			this.kernel.logger(pci, severity,msgid);
	};




	service.prototype.createServer = function(){

		this.server = net.createServer({
			allowHalfOpen : true
		},function (socket) {
			socket.write("");
			this.stopped = false ;
			//}.bind(this));	
		}.bind(this));


		/*
 		 *	EVENT CONNECTIONS
 		 */
		this.server.on("connection",function(socket){
			this.logger("CONNECT TO SERVICE MONITORING FROM : "+socket.remoteAddress, "INFO");

			var closed = false ;
			var conn = new connection(socket);
			this.connections.push(conn) ;
			this.connections[conn.id] = this.connections[this.connections.length-1];

			var callback = function(pdu){
				if (closed || this.stopped ){
					if ( this.syslog ){
						if (this.connections && this.connections[conn.id] )
							this.syslog.unListen("onLog", this.connections[conn.id]["listener"]);
					}
					return; 
				}
				var ele ={
					pdu:pdu
				} 
				conn.write(JSON.stringify(ele));	
			};

			/*this.connections[conn.id]["listener"]  = this.syslog.listenWithConditions(this,{
				severity:{
					data:"INFO"
				}		
			},callback);*/	

			pm2.connect( function() {
				this.logger("CONNECT PM2 REALTIME MONITORING", "DEBUG");
			}.bind(this));
			// PM2 REALTIME
			var pm2Interval = setInterval(function(){
				pm2.describe("nodefony",function(err, list){
					//console.log(list)
					if (closed || this.stopped ){
						clearInterval( pm2Interval );
						return ;	
					}
					var ele = {
						pm2:list
					};
					conn.write(JSON.stringify(ele));	
				});
				
			},1000);

			//SESSIONS  INTERVAL
				//CONTEXT


			//REQUESTS  INTERVAL
			
				//WEBSOCKET OPEN
				//WEBSOCKET CLOSE
				//HTTP 

			socket.on('end',function(){
				closed = true ;
				if ( this.syslog ){
					if (this.connections && this.connections[conn.id] && this.connections[conn.id]["listener"] )
						this.syslog.unListen("onLog", this.connections[conn.id]["listener"]);
				}
				clearInterval( pm2Interval );
				this.logger("CLOSE CONNECTION TO SERVICE MONITORING FROM : "+socket.remoteAddress + " ID :" +conn.id, "INFO");
				socket.end();
				delete this.connections[conn.id];
			}.bind(this))

			socket.on("data",function(buffer){
				try {
					console.log( buffer.toString() )	
				}catch(e){
					this.logger("message :" + buffer.toString() + " error : "+e.message,"ERROR")
				}
			}.bind(this));

		}.bind(this));


		/*
 		 *	EVENT CLOSE
 		 */
		this.server.on("close",function(socket){
			this.stopped = true ;
			this.logger("SHUTDOWN server MONITORING listen on Domain : "+this.domain+" Port : "+this.port, "INFO");
		}.bind(this));

		/*
 		 *	EVENT ERROR
 		 */
		this.server.on("error",function(error){
			this.logger( "SERVICE MONITORING domain : "+this.domain+" Port : "+this.port +" ==> " + error ,"ERROR");
		}.bind(this))

		/*
 		 *	LISTEN ON DOMAIN 
 		 */
		this.server.listen(this.port, this.domain, function(){
			this.logger("Create server MONITORING listen on Domain : "+this.domain+" Port : "+this.port, "INFO");
		}.bind(this));	
			
		/*
 		 *  KERNEL EVENT TERMINATE
 		 */ 
		this.kernel.listen(this, "onTerminate", function(){
			this.stopServer();
		}.bind(this))	



	};


	service.prototype.stopServer = function(){
		this.stopped = true ;
		for (var i = 0 ; i < this.connections.length ; i++){
			this.logger("CLOSE CONNECTIONS SERVICE REALTIME : " + this.name);
			if ( this.connections[i]["listener"] ){
				this.syslog.unListen("onLog", this.connections[i]["listener"]);
			}
			this.connections[i].socket.end();	
			var id = this.connections[i].id;
			delete this.connections[id];
		}
		this.connections.length = 0 ;
		if (this.server){
			try {
				this.server.close();
			}catch(e){
				this.logger(e, "ERROR")
			}
		}
	};

	return service; 


});
