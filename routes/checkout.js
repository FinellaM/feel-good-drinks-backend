// CHECKOUT ROUTE
// fetch requests from CheckoutAPI (frontend) will come here
const express = require('express')
const router = express.Router()
const Cart = require('./../models/Cart')
const Order = require('./../models/Order') 
const path = require('path')

// checkout route
router.get('/', (req, res) => {
    
    // check if cart is set already (in session store)
    if (!req.session.cart) {
        return res.status(400).json({
            message: "Your cart is empty"
        })
    }
    // cart exists:
    var cart = new Cart(req.session.cart); // create a new cart off the one stored in the session
    res.json(cart);
})

// checkout POST route - charge the user (Stripe)
router.post('/', async (req, res) => { 
    //16.08.21**************************
    // validate  - check that request body isn't empty
    if(Object.keys(req.body).length === 0){   
        return res.status(400).send({message: "Listing content can't be empty"})
      }
    console.log('req.body = ', req.body)
    //***************************

    // check if cart is set already (in session store)
    if (!req.session.cart) {
        return res.status(400).json({
            message: "Your cart is empty"
        })
    }
    // cart exists:
    var cart = new Cart(req.session.cart); // create a new cart off the one stored in the session

    var stripe = require('stripe')(
        'sk_test_51IlvwoCM9bBMeA8HCEAu6g4u1BqKSe7h3HB2YHlxegxsTnfnIXUM4xkAr7yDvdku63CIP87ri74icCY7Q5wBmJDd00xTGYPyLY'
    )
    
    // `source` is obtained with Stripe.js; see https://stripe.com/docs/payments/accept-a-payment-charges#web-create-token
    const charge = await stripe.charges.create({
        amount: cart.totalPrice * 100, // needs to be in cents
        currency: 'gbp',
        //source: 'req.body.stripeToken', // Stripe token generated by Stripe STK when validating the credit card. Send in checkout form.
        source: 'tok_visa', // token for testing (from https://stripe.com/docs/testing#cards)
        description: 'My First Test Charge'
    }, function(err, charge) {
        if (err) {
            console.log(err)
            return res.status(500).send({
                message: "Problem with checkout",
                error: err
            })
        }
        // Create a new Order:
        // 1. configure the order object
        var order = new Order({
          // req.body = where express stores values sent in the post request (from frontend checkout form)
          userName: req.body.userName,
          userEmail: req.body.userEmail,
          userNumber: req.body.userNumber,
          address: req.body.address,
          cart: cart, //  cart already exists
          paymentID: charge.id // retrieve from the charge object (created by Stripe)
        }) 
        // 2. Save it to the database
        /*order.save(function(err, result) {
            if (err) {
                console.log(err)
                return res.status(500).send({
                    message: "Problem creating order",
                    error: err
                })
            } 
            console.log("Order processed successfully")
            res.json(charge) // json response
            req.session.cart = null; // empty cart
        }) */
        // save new listing to DB
        order.save()
        .then(order => {        
            // success! return 201 status with order object
            return res.status(201).json(order)
        })
        .catch(err => {
            console.log(err)
            return res.status(500).send({
            message: "Problem creating your order",
            error: err
            })
        })
        req.session.cart = null; // empty cart
    })
})

// EXPORT the router object 
// (imported in server.js in 'ROUTES' section)
module.exports = router