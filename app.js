const express = require("express");
const socket=require("socket.io");
const http =require("http");
const {Chess}=require("chess.js");
const path = require("path");
const { title } = require("process");
const { exec } = require('child_process');


const app=express();
const server=http.createServer(app);

const io=socket(server);
let chess=new Chess();

let players={};
let currentPlayer="w";

app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,'public')));

app.get("/",(req,res)=>{
    res.render("index",{title:"Chess Game"});
})

io.on("connection",function(uniquesocket){
    console.log("Connected")
    

    if(!players.white){
        players.white=uniquesocket.id;
        uniquesocket.emit("playerRole","w");
    }
    else if(!players.black){
        players.black=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
    }
    else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on('disconnect',function(){
        if(uniquesocket.id===players.white){
            delete players.white;
        }else if(uniquesocket.id===players.black){
            delete players.black;
        }

        // Reset the game state when a player disconnects
        chess.reset(); // Resets the chessboard to the starting position
        io.emit("boardState", chess.fen()); // Emit new board state to reset the board for remaining players
        console.log("Game reset after player disconnect");
        
    })

    uniquesocket.on("move",(move)=>{
        try {
            if(chess.turn()==='w' && uniquesocket.id!==players.white)return;
            if(chess.turn()==='b' && uniquesocket.id!==players.black)return;
            const result=chess.move(move);
            if(result){
                currentPlayer=chess.turn();
                io.emit("move",move);
                io.emit("boardState", chess.fen()) //game current state fen

                // Check for checkmate
                if (chess.isCheckmate()) {
                    const winner = chess.turn() === 'w' ? players.black : players.white;
                    const loser = chess.turn() === 'w' ? players.white : players.black;

                    io.to(winner).emit("gameOver", { winner: true });
                    io.to(loser).emit("gameOver", { winner: false });
                }
                

            }
            else{
                console.log("Invalid move : ",move);
                uniquesocket.emit("invalidMove",move);
            }
            
        } catch (error) {
            console.log(error);
            uniquesocket.emit("invalidMove",move);
        }
    })


})



const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
