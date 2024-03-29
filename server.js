import express from "express";
import db from "./database.js";
import md5 from "md5";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import cors from 'cors'
import zlib from 'zlib'


dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())

app.listen(process.env.HTTP_PORT, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", process.env.HTTP_PORT));
});

app.get("/api", (_, res) => {
  res.status(200).send('Server running');
});

app.get("/api/user", (req, res, next) => {
  const sql = "select * from UserData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).send({error: err.message});
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.get("/api/user/:id", (req, res, next) => {
  const sql = "select * from UserData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.get("/api/cart/:id", (req, res, next) => {
  const sql = "select * from CartData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.post("/api/cart/:id", (req, res, next) => {
  const newItem = req.body.item;
  const cartId = req.params.id;
  db.get("SELECT items FROM CartData WHERE id = ?", [cartId], (err, result) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    const items = JSON.parse(result.items);
    items.push(newItem);
    const data = JSON.stringify(items);
    db.run(
      "UPDATE CartData SET items = ? WHERE id = ?",
      [data, cartId],
      function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({
          message: "success",
          data: newItem,
          changes: this.changes,
        });
      }
    );
  });
});

app.delete("/api/cart/:id", (req, res, next) => {
  const cartId = req.params.id;
  const itemId = req.body.id;
  db.get("SELECT items FROM CartData WHERE id = ?", [cartId], (err, result) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    let items = JSON.parse(result.items);
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    items.splice(index, 1);
    const newItems = JSON.stringify(items);
    db.run(
      "UPDATE CartData SET items = ? WHERE id = ?",
      [newItems, cartId],
      function (err, result) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }

        res.json({ message: "deleted", changes: this.changes });
      }
    );
  });
});

app.patch("/api/user/:id", (req, res, next) => {
  const data = {
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    uniqueStoreId: req.body.uniqueStoreId,
  };
  db.run(
    `UPDATE user set 
           email = COALESCE(?,email), 
           password = COALESCE(?,password)
           role = COALESCE(?,role)
           uniqueStoreId = COALESCE(?,uniqueStoreId)
           WHERE id = ?`,
    [data.email, data.password, data.role, data.uniqueStoreId, req.params.id],
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({
        message: "success",
        data: data,
        changes: this.changes,
      });
    }
  );
});

app.delete("/api/user/:id", (req, res, next) => {
  db.run(
    "DELETE FROM UserData WHERE id = ?",
    req.params.id,
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({ message: "deleted", changes: this.changes });
    }
  );
});

app.post("/api/user/", (req, res, next) => {
  const errors = [];
  if (!req.body.password) {
    errors.push("No password specified");
  }
  if (!req.body.email) {
    errors.push("No email specified");
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(",") });
    return;
  }
  const data = {
    email: req.body.email,
    password: md5(req.body.password),
    role: req.body.role,
  };
  const sql = "INSERT INTO UserData (email, password, role) VALUES (?,?,?)";
  const params = [data.email, data.password, data.role];
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: data,
      id: this.lastID,
    });
  });
});

app.get("/api/product/page/:page", (req, res, next) => {
  const page_number = req.params.page;
  const per_page = 10;
  const offset = (page_number - 1) * per_page;
  const sql = "SELECT * FROM ProductData LIMIT ? OFFSET ?";
  const params = [per_page, offset];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    const compressedData = zlib.deflateSync(JSON.stringify(rows));
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Encoding': 'deflate'
    });
    res.end(compressedData);
  });
});

app.get("/api/product/:id", (req, res, next) => {
  const sql = "select * from ProductData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.post("/api/product/:id", (req, res, next) => {
  const errors = [];
  if (!req.body.title) {
    errors.push("No title specified");
  }
  if (!req.body.quantity) {
    errors.push("No quantity specified");
  }
  if (!req.body.price) {
    errors.push("No price specified");
  }
  if (!req.body.category) {
    errors.push("No category specified");
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(",") });
    return;
  }
  const data = {
    title: req.body.title,
    imageUrl: "https://picsum.photos/400",
    quantity: req.body.quantity,
    price: req.body.price,
    category: req.body.category,
    uniqueStoreId: req.params.id,
  };
  const params = [
    data.title,
    data.imageUrl,
    data.quantity,
    data.price,
    data.category,
    data.uniqueStoreId,
  ];
  const sql =
    "INSERT INTO ProductData (title, imageUrl, quantity, price, category, uniqueStoreId) VALUES (?,?,?,?,?,?)";
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: data,
      id: this.lastID,
    });
  });
});

app.get("/api/store/:id", (req, res, next) => {
  const sql = "select * from StoreData where uniqueStoreId = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.get("/api/store/:id/product", (req, res, next) => {
  const sql = "select * from ProductData where uniqueStoreId = ?";
  const params = [req.params.id];
  db.all(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.patch("/api/product/:id", (req, res, next) => {
  const data = {
    quantity: req.body.quantity,
  };
  db.run(
    `UPDATE ProductData set 
            quantity = COALESCE(?,quantity) 
            WHERE id = ?`,
    [data.quantity, req.params.id],
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({
        message: "success",
        data: data,
        changes: this.changes,
      });
    }
  );
});

app.delete("/api/product/:id", (req, res, next) => {
  db.run(
    "DELETE FROM ProductData WHERE id = ?",
    req.params.id,
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({ message: "deleted", changes: this.changes });
    }
  );
});

app.get("/api/store", (req, res, next) => {
  const sql = "select * from StoreData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.post("/api/store", (req, res, next) => {
  const errors = [];
  if (!req.body.title) {
    errors.push("No title specified");
  }
  if (!req.body.adminId) {
    errors.push("No quantity specified");
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(",") });
    return;
  }
  const sqlData = "select * from StoreData";
  const paramsData = [];

  db.all(sqlData, paramsData, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    const count = rows.length;
    addStore(count);
  });
  function addStore(count) {
    const data = {
      id: req.body.adminId,
      name: req.body.title,
      uniqueStoreId: count + 1,
    };
    const params = [data.id, data.name, data.uniqueStoreId];
    const sql =
      "INSERT INTO StoreData (id, name, uniqueStoreId) VALUES (?,?,?)";
    db.run(sql, params, function (err, result) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: "success",
        data: data,
        id: this.lastID,
      });
    });
  }
});

app.delete("/api/store/:id", (req, res, next) => {
  db.run(
    "DELETE FROM StoreData WHERE uniqueStoreId = ?",
    req.params.id,
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({ message: "deleted", changes: this.changes });
    }
  );
});

