const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://blog-site-68835.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1lk0tsy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const tokenverify = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.RANDOM_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const blogpostcollection = client.db("blogpostDB").collection("blogpost");
    const commentCollection = client.db("commentsDB").collection("comments");
    const wiahListCollection = client.db("wishlistDB").collection("wishlist");

    app.post("/jwt", (req, res) => {
      const userdata = req.body;
      const token = jwt.sign(userdata, process.env.RANDOM_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', 
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    app.get("/comment",tokenverify, async (req, res) => {
      const id = req.query.id;
      console.log(req.cookies);
      const filterId = { blogId: id };
      const result = await commentCollection.find(filterId).toArray();
      res.send(result);
    });

    app.post("/comment", async (req, res) => {
      const coment = req.body;
      const result = await commentCollection.insertOne(coment);
      res.send(result);
    });

    app.get("/postcount", async (req, res) => {
      const count = await blogpostcollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/recentpost", async (req, res) => {
      const quairy = [
        {
          $sort: { currentdate: -1 },
        },
        {
          $limit: 6,
        },
      ];

      const result = await blogpostcollection.aggregate(quairy).toArray();

      res.send(result);
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

      const skip = (page - 1) * size;

      const result = await blogpostcollection
        .find(categoryfilter)
        .skip(skip)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/feautured", async (req, res) => {
      const quairy = [
        {
          $project: {
            _id: 1,
            title: 1,
            pic: 1,
            name: 1,
            descriptionLength: { $strLenCP: "$description" },
          },
        },
        {
          $sort: { descriptionLength: -1 },
        },
        {
          $limit: 10,
        },
      ];

      const result = await blogpostcollection.aggregate(quairy).toArray();
      res.send(result);
    });

    app.get("/allpost/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await blogpostcollection.findOne(query);
      res.send({ result });
    });

    app.get("/wishlist", async (req, res) => {
      const quairy = req.query.email
      const result = await wiahListCollection.find({email: quairy}).toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wish = req.body;
      const result = await wiahListCollection.insertOne(wish);
      res.send(result);
    });

    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const deleteone = { _id: id };
      const result = await wiahListCollection.deleteOne(deleteone);
      res.send(result);
    });

    app.post("/blogpost", async (req, res) => {
      const post = req.body;
      const result = await blogpostcollection.insertOne(post);
      res.send(result);
    });
    app.put("/blogpost/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const quairy = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateblog = {
        $set: {
          title: updateData.title,
          sort_description: updateData.sort_description,
          img: updateData.img,
          category: updateData.category,
          description: updateData.description,
        },
      };
      const result = await blogpostcollection.updateOne(
        quairy,
        updateblog,
        option
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
