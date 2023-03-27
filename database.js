import pkg from 'sqlite3';
import bcrypt from 'bcrypt'


const {verbose} = pkg;

import fs from "fs";

const sqlite3 = verbose();
const DBSOURCE = "db.sqlite"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message)
        throw err
    } else {
        console.log('Connected to the SQLite database.');
        const users = GetUsersAsJson();
        db.run(`create table UserData (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(50),
                password VARCHAR(50),
                role VARCHAR(11),
                uniqueStoreId INT
             )`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already User-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO UserData (id, email, password, role, uniqueStoreId) VALUES (?,?,?,?,?)';
                    users.forEach(async (newUser) => {
                        await db.run(insert, [newUser.id, newUser.email, await bcrypt.hash(newUser.password, 10), newUser.role, newUser.uniqueStoreId], function (err) {
                          if (err) {
                            console.log(err.message, 'here is error');
                          }
                          else if (newUser.role === 'user') {
                            db.run(`INSERT INTO CartData (id, items) VALUES (?, '[]')`, [this.lastID]);
                          }
                        });
                    })
                    console.log(`${users.length} Users created`);
                }
            });
        db.run(
            `create table CartData (
                cart_id INTEGER PRIMARY KEY,
                id INTEGER NOT NULL,
                items TEXT,
                FOREIGN KEY (id) REFERENCES UserData(id)
              )`,
              (err) => {
                  if (err) {
                      // Table already created
                      console.log('Already Cart-table there');
                  } else {
                      // Table just created, creating some rows
                      console.log('Cart-table created');
                  }
              }
        )
        const stores = GetStoresAsJson();
        db.run(`create table StoreData (
                id VARCHAR(2),
                name VARCHAR(50),
                uniqueStoreId INT
              )`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already Store-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO StoreData (id, name, uniqueStoreId) VALUES (?,?,?)';
                    stores.map(newStore => {
                        db.run(insert, [newStore.id, newStore.name, newStore.uniqueStoreId]);
                    })
                    console.log(`${stores.length} Stores created`);
                }
            });
        const products = GetProductsAsJson();
        db.run(`create table ProductData (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    title VARCHAR(50), 
                    description TEXT, 
                    imageUrl VARCHAR(50),
                    uniqueStoreId INT, 
                    price VARCHAR(50), 
                    quantity INT, 
                    category VARCHAR(50));`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already Products-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO ProductData (id, title, description, imageUrl, uniqueStoreId, price, quantity, category) VALUES (?,?,?,?,?,?,?,?)';
                    products.map(product => {
                        db.run(insert, [product.id, product.title, product.description, product.imageUrl, product.uniqueStoreId, product.price, product.quantity, product.category]);
                    })
                    console.log(`${products.length} Products created`);
                }
            });  
    }
});

function GetUsersAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/User_Mock_data.json"));
}

function GetStoresAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/Store_Mock_data.json"));
}

function GetProductsAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/Products_Mock_data.json"));
}

export default db;