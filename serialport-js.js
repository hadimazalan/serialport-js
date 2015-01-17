var sys     = require('sys'),
    CP      = require('child_process'),
    events  = require('events');

var serial={
    find:findPorts,
    open:term,
    send:push
};

function findPorts(callback){
    CP.exec(
        'setserial /dev/ttyUSB*', 
        (
            function(){
                return function(err,data,stderr){
                    if(!callback)
                        return;
                    var ports=[];
                    data=data.split('\n');
                    for(var i=0; i<data.length;i++){
                        var port=data[i].split(',');
                        if(port[0].indexOf('tty')<0)
                            continue;
                        
                        ports.push(port[0]);
                    }
                    
                    callback(ports);
                }
            }
        )(callback)
    );
}

function push(port,data){
    CP.exec(
        'echo "'+data.replace(/\"/g,'\"')+'" > '+port
    )
}

function term(port,delimiter){
    var out='',
        portRefrence=new events.EventEmitter(),
        child=CP.spawn(
            'cat', 
            [port],
            {
                stdio:['pipe','pipe','pipe']
            }
        );
    
    child.serialPort=port;
    
    child.stdout.on(
        'data', 
        function (data) {
            out+=data.asciiSlice();
            if(out.indexOf(delimiter)<0)
                return;
            
            portRefrence.emit(
                'data',
                out
            );
        
            out='';
        }
    );

    child.stderr.on(
        'data', 
        function (data) {
            portRefrence.emit(
                'err',
                data
            );
        }
    );

    child.on(
        'close', 
        function (code) {
            console.log('child process exited with code ' + code);
        }  
    );
    
    function sendData(data){
        push(child.serialPort,data);
    }
    
    portRefrence.port=child.serialPort;
    portRefrence.send=sendData;
    portRefrence.close=function(){
        child.close();
    };
    
    return portRefrence;
}

module.exports=serial;