// load .env data into process.env
require("dotenv").config();
const database = require('./queries/user_queries.js');
const filter_db = require('./queries/search_filters.js');
const listings = require('./queries/jays_queries.js');
const editing = require('./queries/editing_query.js');
const createPet = require('./queries/create_pet.js');

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
const { create } = require("mocha/lib/suite");

// Mount all resource routes
// Note: Feel free to replace the example routes below with your own
app.use("/api/users", usersRoutes(db));
// Note: mount other resources here, using the same pattern above

// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).


// ---------------------------------------------
//log functions

//login
app.get('/login/:id', (req, res) => {
  req.session.userId = req.params.id;
  res.redirect("/");
});

// Post to logout
app.get('/logout/:id', (req, res) => {
  req.session.userId = null;
  res.redirect("/");
});

//------------------------------------------------
//page gets

//featured page
app.get("/", (req, res) => {
  const users = database.getAllUsers();
  const id = req.session.userId;
  const user = database.getUserWithId(id);
  const listings_promise = listings.getAllListings();
  return Promise.all([user,listings_promise,users])
  .then( ([user,listings,users]) => {
    res.render("featured",{user,listings,users});
  });
});

//listed pets
app.get("/listed-pets", (req, res) => {
  const id = req.session.userId;
  const user = database.getUserWithId(id)
  const listings_promise = listings.userListings(id)
  return Promise.all([user,listings_promise])
  .then( ([user,listings]) => {
    res.render("listed",{user,listings});
  })
})

//create page
app.get("/create/:id", (req, res) => {
  const id = req.session.userId;
  const user = database.getUserWithId(id);
  return Promise.all([user])
  .then ( ([user]) => {
    res.render("create",{user})
  });
});




//----------------------------------------------
//Featured Page - POSTs

//filter search button
app.post("/", (req, res) => {
  let options = {
    favourites: req.body.favourites,
    country: req.body.country,
    city: req.body.city,
    type: req.body.type,
    breed: req.body.breed,
    gender: req.body.gender,
    maxPrice: req.body.maxPrice,
    minPrice: req.body.minPrice
  }
  Object.keys(options).forEach(key => {
    if (options[key] === '') {
      delete options[key];
    }
  });
  const id = req.session.userId;
  const user = database.getUserWithId(id)
  const filters = filter_db.search(id,options);
  return Promise.all([user, filters])
  .then( ([user,listings]) => {
    res.render("featured",{user, listings});
  })
});

//My favourites button


//My listings button


//My sold listings button


//-----------------------------------------------
//Listed, edit and create page

//Save pet button - unknown if functional
app.post("/savedPet/:id", (req, res) =>{
  const id = req.session.userId;
  const listing_id = req.body.listing_id;
  console.log('TESTING ROUTING');
  const addFavPet = listings.addToFavourites(id,listing_id);

  return Promise.all([addFavPet])
  .then ( ([addFavPet]) => {
    res.redirect('/');
  });


});


//Sold pet post

app.post ("/checkSold/:id", (req, res) =>{
  const id = req.session.userId;
  const check = req.body.check;

  const user = database.getUserWithId(id);
  const newListings = listings.is_sold_listings(id,check);

  return Promise.all([user,newListings])
  .then ( ([user,listings]) => {
    res.render("listed", {user,listings});
  });






});


//Edit button - listed page
app.post("/listed-pets" , (req, res) => {
  const id = req.session.userId;
  const listing_id = req.body.listingId;
  const user = database.getUserWithId(id);
  const pet = listings.listingById(listing_id);
  return Promise.all([user,pet])
  .then ( ([user,listings]) => {
    res.render("edit", {user,listings,listing_id});
  });
});

//Submit button - edit page
app.post("/edit", (req, res) => {
  let petChange = {
    name: req.body.pet_name,
    type: req.body.type,
    breed: req.body.breed,
    gender: req.body.gender,
    colour: req.body.colour,
    price: req.body.price,
    ready_date: req.body.ready_date,
    is_sold: req.body.is_sold,
    date_sold: req.body.date_sold,
    description: req.body.description
  }
  Object.keys(petChange).forEach(key => {
    if (petChange[key] === '') {
      delete petChange[key];
    }
  });
  if (petChange.is_sold === 'on'){
    petChange.is_sold = true;
  }
  else {
    petChange.is_sold = false;
  }
  const id = req.session.userId;
  const listing_id = req.body.listingId;
  const user = database.getUserWithId(id);
  const listing = listings.userListings(id);
  const update = editing.edit(id,listing_id,petChange);
  return Promise.all([user,update,listing])
  .then ( ([user,update,listings]) => {
    res.redirect("/listed-pets");
  });
});

//Create button - listed page
app.post("/create", (req, res) => {
  const id = req.session.userId;
  let addPet = {
    name: req.body.pet_name,
    type: req.body.type,
    breed: req.body.breed,
    gender: req.body.gender,
    colour: req.body.colour,
    price: req.body.price,
    ready_date: req.body.ready_date,
    is_sold: req.body.is_sold,
    date_sold: req.body.date_sold,
    description: req.body.description,
    birthday: req.body.birthday,
    thumbnail_photo_url: req.body.thumbnail_photo_url
  }
  Object.keys(addPet).forEach(key => {
    if (addPet[key] === '') {
      delete addPet[key];
    }
    if (addPet.is_sold === 'on'){
      addPet.is_sold = true;
    }
    else {
      addPet.is_sold = false;
    }
  });
  const addNewPet = createPet.createNewPet(id,addPet)
  return Promise.all([addNewPet])
  .then ( ([addNewPet]) => {
    res.redirect("/")
  });
});

// Admin DELETE PAGE
app.post("/deletePet/:id", (req, res) => {
  const pet_id = req.params.id;
  const deletePet = listings.removeListing(pet_id)

  return Promise.all([deletePet])
  .then ( ([deletePet]) => {
    res.redirect("/")
  });

});


app.post("/deleteUserPet/:id", (req, res) => {
  const pet_id = req.params.id;
  const deletePet = listings.removeListing(pet_id)

  return Promise.all([deletePet])
  .then ( ([deletePet]) => {
    res.redirect("/listed-pets");
  });

});


//listen on port
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

//---------------------------------------------------
// TWILIO SEND A SMS
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

app.post('/sms', (req, res) => {
  client.messages
  .create({
     body: req.body.text,
     from: '+18597626484',
     to: '+1 2893398683'
   })
  .then(message => {
    console.log(message.sid);
    res.redirect('/')
  });
})
