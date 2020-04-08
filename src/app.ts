const fs = require('fs');
const io = require('socket.io')();
import {User, CoordinatesSips, Token } from './models/users';

let noop = () => {
};

io.on('connection', (client: any) => {
  client.on('login', (userData: any, callback: any) => {
    callback = callback || noop;
    userData = JSON.parse(userData);

    fs.readFile('./database/users.json', 'utf8', (err: string, data: string) => {
      if (err) {
        throw err;
      } else {
        console.log(data);
        let players = JSON.parse(data);
        let yourTurn = false;

        if (players.length === 0) {
          yourTurn = true
        }

        const token = require('uuid/v4');

        let player: User = {
          ships: userData.values,
          token: token(),
          yourTurn: yourTurn
        };

        players.push(player);
        fs.readFile('./database/ships.json', 'utf8', (err: string, dataShips: string) => {
          if (err) {
            throw err;
          } else {
            let shipsList = JSON.parse(dataShips);

            let coordinatesSips: CoordinatesSips = {
              token: player.token,
              ships: userData.ships
            };

            shipsList.push(coordinatesSips);

            fs.writeFile('./database/ships.json', JSON.stringify(shipsList), (err: string) => {
              if (err) {
                throw err;
              }
            });
          }
        });
        fs.writeFile('./database/users.json', JSON.stringify(players), (err: string) => {
          if (err) {
            throw err;
          } else {
            return callback(null, JSON.stringify({token: player.token}));
          }
        });
      }
    });
  });

  client.on('getShips', (userToken: Token, callback: any) => {
    callback = callback || noop;

    fs.readFile('./database/users.json', 'utf8', (err: string, data: string) => {
      if (err) {
        throw err;
      } else {
        let users: Array<User> = JSON.parse(data);

        let isUser = users.filter((user) => {
          return user.token === userToken.token;
        });

        if (isUser.length !== 1) {
          return callback('User not found');
        } else {
          let remainingShips = fs.readFileSync('./database/ships.json', 'utf8');

          io.emit('getShips', {
            data,
            remainingShips
          });
          return callback(null);
        }
      }
    });
  });

  client.on('move', (userMove: string) => {
    let move = JSON.parse(userMove);

    let data = fs.readFileSync("./database/users.json", "utf8");
    let users = JSON.parse(data);

    users.forEach((user: User, i: number) => {
      if (user.token !== move.token) {
        user.ships.forEach((ship: any) => {
          for (let key in ship) {
            if (key == move.cell) {
              switch (ship[key]) {
                case 'empty':
                  ship[key] = 'miss';
                  whoseMove(users);
                  break;
                case 'empty ship':
                  ship[key] = 'hit';
                  checkHitOrKilled(i, move.cell, user);
                  break;
                default:
                  console.error('wrong coordinates')
              }
            }
          }
        });
      }
    });

    let remainingShips = fs.readFileSync('./database/ships.json', 'utf8');
    users = JSON.stringify(users);

    fs.writeFileSync('./database/users.json', users);

    io.emit('move', {
      users,
      remainingShips
    });
  });

  client.on('logout', (token: Token) => {
    let usersShips = fs.readFileSync('./database/ships.json', 'utf8');
    usersShips = JSON.parse(usersShips);
    usersShips.forEach((userShips: any, i: number) => {
      if(userShips.token === token){
        usersShips.splice(i, 1);
      }
    });

    let remainingShips = JSON.stringify(usersShips);
    fs.writeFileSync('./database/ships.json', remainingShips);

    let users = fs.readFileSync('./database/users.json', 'utf8');
    users = JSON.parse(users);
    users.forEach((user: any, i: number) => {
      if(user.token === token){
        users.splice(i, 1);
      }
    });

    users = JSON.stringify(users);
    fs.writeFileSync('./database/users.json', users);
  });
});

const checkHitOrKilled = (item: number, cell: string, user: User) => {
  let dataShips = fs.readFileSync('./database/ships.json', 'utf8');
  dataShips = JSON.parse(dataShips);
  let playerShips = dataShips[item].ships;

  playerShips.forEach((playerShip: { [key: string]: string; }) => {
    for (let playerShipCoord in playerShip) {
      if (playerShipCoord == cell) {
        playerShip[playerShipCoord] = 'hit'
      }
    }
  });

  playerShips.forEach((playerShip: { [key: string]: string; }, i: number) => {
    let values = [];
    for (let key in playerShip) {
      values.push(playerShip[key]);
    }
    if (values.every(elem => elem == 'hit')) {
      user.ships.forEach((coord: any) => {
        for (let num in coord) {
          for (let coordShip in playerShip) {
            if (num === coordShip) {
              coord[num] = 'kill';
            }
          }
        }
      });
      playerShips.splice(i, 1);
    }
  });

  dataShips[item].ships = playerShips;
  fs.writeFileSync('./database/ships.json', JSON.stringify(dataShips));
};

const whoseMove = (users: Array<User>) => {
  users.forEach((user) => {
    user.yourTurn = !user.yourTurn;
  });
};

const port = 8000;
io.listen(port);
console.log('listening on port ', port);