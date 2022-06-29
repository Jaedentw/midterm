// load .env data into process.env
require("dotenv").config();
const database = require('./database');
const search = require('./Queries/search_filters.js')
const listings = require('./Queries/Jays_Queries.js')

// Web server config
const PORT = process.env.PORT || 8080;
const sassMiddleware = require("./lib/sass-middleware");
const express = require("express");
const app = express();
const morgan = require("morgan");
const cookieSession = require('cookie-session')

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect();

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan("dev"));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  keys: ['ABC/@432cuas42/as'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))


app.use(
  "/styles",
  sassMiddleware({
    source: __dirname + "/styles",
    destination: __dirname + "/public/styles",
    isSass: false, // false => scss, true => sass
  })
);

app.use(express.static("public"));

// Separated Routes for each Resource
// Note: Feel free to replace the example routes below with your own
const usersRoutes = require("./routes/users");
const { password, user } = require("pg/lib/defaults");

// Mount all resource routes
// Note: Feel free to replace the example routes below with your own
app.use("/api/users", usersRoutes(db));
// Note: mount other resources here, using the same pattern above

// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).


// ---------------------------------------------
// functions



app.get('/login/:id', (req, res) => {

      req.session.userId = req.params.id;
      res.redirect("/");


});


app.get("/", (req, res) => {
  const id = req.session.userId;
  const user = database.getUserWihId(id)
  const listings_promise = listings.getAllListings()

  return Promise.all([user,listings_promise])
  .then( ([user,listings]) => {
    res.render("featured",{user,listings});
  })

});

app.post("/", (req, res) => {
  const options = {
    country: req.body.country,
    city: req.body.city,
    type: req.body.type,
    breed: req.body.breed,
    gender: req.body.gender,
    price: req.body.price,
    ready_date: req.body.ready_date

  }
  Object.keys(options).forEach(key => {
    if (options[key] === '') {
      delete options[key];
    }
  });
  const id = req.session.userId;
  const user = database.getUserWihId(id)
  const filters = search.search(id,options);

  return Promise.all([user,filters])
  .then( ([user,listings]) => {
    console.log('These are the filters: ', options)
    res.render("index",{user,listings});
  })

});


// post request for register
app.post("/register", (req, res) => {

  res.redirect("/");
});

// get for profile page
app.get("/profile", (req, res) => {
  const templateVars = {userID: req.session.userId, user: user};
  res.render("profile-page",templateVars);
});

// post request for profile page
app.post("/profile", (req, res) => {
  res.render("register");
});


// Post to logout
app.get('/logout/:id', (req, res) => {

  req.session.userId = null;
  res.redirect("/");


});

//get sold pets
app.get("/sold-pets", (req, res) => {
  const templateVars = {userID: req.session.userId, user: database.user};
  res.render("sold", templateVars);
});

//listed pets
app.get("/listed-pets", (req, res) => {
  const id = req.session.userId;
  const user = database.getUserWihId(id)
  const listings_promise = listings.userListings(id)

  return Promise.all([user,listings_promise])
  .then( ([user,listings_promise]) => {
    res.render("listed",{user,listings_promise});
  })
})

app.post("/savepet", (req, res) => {
  console.log(req.session);
  const user_id = req.session.userId;
  const pet_id = 0;

})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});



/*
TEST FUNCTION
*/

