const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken')
var cookieParser = require('cookie-parser')
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1lk0tsy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const blogpostcollection = client.db("blogpostDB").collection("blogpost");

    app.post('/jwt', async(req, res)=>{
        const user = req.body;
        const result = await jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' });
        res
        .cookie('token', result, {
            httpOnly: true,
            secure: false,
            
        })
        .send({success: true})
    })

    app.get("/postcount", async (req, res) => {
      const count = await blogpostcollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/allpost", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const category = req.query.category;
      const filtertitle = req.query.title;
      var categoryfilter;
      if (!(category === "All")) {
        categoryfilter = { category: category };
      }
      if (!(filtertitle === "")) {
        categoryfilter = { title: filtertitle };
      }
      console.log(req.cookies.token);
      const skip = (page - 1) * size;
      console.log(req.query.title);
      const result = await blogpostcollection
        .find(categoryfilter)
        .skip(skip)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/allpost/:id", async (req, res) => {
      const id = req.params.id;
      
      const query = { _id: new ObjectId(id) };
      const result = await blogpostcollection.findOne(query);
      res.send({ result });
    });

    app.post("/blogpost", async (req, res) => {
      const post = req.body;
      const result = await blogpostcollection.insertOne(post);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
