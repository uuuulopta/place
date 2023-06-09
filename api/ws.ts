import { WebSocketServer,WebSocket } from 'ws';
import {Redis,logger,BSON} from "./imports"
import "dotenv/config"
const redis = new Redis("websocket")
function parseInput(color: string, x: string, y: string, callback: Function){
    const hexRegex = new RegExp("[0-9A-Fa-f]{6}")
    if(!hexRegex.test(color)) throw Error("Bad color value!");
    if(!RegExp( "[0-9]+" ).test(x)) throw Error("Bad X")
    if(!RegExp( "[0-9]+" ).test(y)) throw Error("Bad Y")
    callback()
}
//                                      v gotta do this because typescripts type of env is string | undefined,  even though it can be a number ¯\_(ツ)_/¯
const ws = new WebSocketServer({port: <number><unknown> process.env.WEBSOCKET_PORT,
                                host: process.env.WEBSOCKET_HOST   
                              });
console.log(`Lisetning on ${process.env.WEBSOCKET_HOST}:${process.env.WEBSOCKET_PORT}`)
redis.run()
ws.on("connection",function connection(wsclient){
    wsclient.on("error", logger.info)
    wsclient.on("close",()=> {
        if(ws.clients.size == 0){
            console.log("Connection closed")
            redis.setExpire()
        }
    })
    wsclient.on('message', function message(data) {
        try {
            console.log('received: %s', data);
            let message:string = data.toString()
            const params = message.split(" ")
            if(params.length != 3) throw Error("Received bad message")
                parseInput(params[2],params[0],params[1],() => {
                    ws.clients.forEach(function each(client){
                        if(wsclient != client && client.readyState == WebSocket.OPEN){
                            client.send(message)
                        }
                    })    
                })
        }
        catch (error){
            logger.error(error.message)
        }
    });
})

