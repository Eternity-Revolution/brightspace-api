const oauth2 = require("simple-oauth2");
const express = require("express");
const session = require('express-session');
const request = require("request");
const path = require('path')

const randomBytes = require("crypto").randomBytes;
const state = randomBytes(20).toString("hex");
const sessionSecret = randomBytes(20).toString("hex");

const app = express();
// var accessToken ='';

app.use(session({
  secret: sessionSecret,
  resave: true,
  saveUninitialized: true
}));

const config = {
  client: {
    id: "b50abdc3-24f2-490d-ae9a-37fee2bd3439",
    secret: "Xl-eth3MZtKbHl9CpgxC90XDSklVhvPuvWp4t3YsXPs",
  },
  auth: {
    tokenHost: "https://auth.brightspace.com",
    tokenPath: "core/connect/token",
    authorizePath: "/oauth2/auth",
  },
};

const client = new oauth2.AuthorizationCode(config);

app.get("/auth", (req, res) => {
  const redirectUri = req.query.redirect || '/';
  req.session.redirectUri = redirectUri;
  const authorizationUri = client.authorizeURL({
    redirect_uri: "https://ec2-3-96-197-44.ca-central-1.compute.amazonaws.com:3005/callback",
    scope: "quizzing:*:*",
    state: state,
  });
  res.redirect(authorizationUri);
});

app.get("/callback",  async (req, res) => {
  // const redirectUri = req.session.redirectUri || '/';
  // delete req.session.redirectUri;
  const options = {
    code: req.query.code,
    redirect_uri: "https://ec2-3-96-197-44.ca-central-1.compute.amazonaws.com:3005/callback",
  };

  try {
    const result = await client.getToken(options);
    process.env.accessToken = result.token.access_token;
    console.log("Access token:", result.token.access_token);
    // res.redirect(redirectUri);
    // return res.send(result);
    return res.sendFile(path.join(__dirname, './index.html'));
    // res.send('Access token obtained!');
  } catch (error) {
    console.error("Access Token Error:", error);
    res.send("Failed to obtain access token");
  }
});

app.get("/access_token", (req, res) => {
  res.send(process.env.accessToken);
});
// app.get('/refresh', async (req, res) => {
//   if (!accessToken) {
//     res.status(400).send('Access token not available');
//     return;
//   }

//   const tokenObject = client.createToken(accessToken);

//   try {
//     const refreshedToken = await tokenObject.refresh();
//     accessToken = refreshedToken.token.access_token;
//     console.log('Access token refreshed:', refreshedToken.token.access_token);
//     res.send('Access token refreshed!');
//   } catch (error) {
//     console.error('Error refreshing access token:', error.message);
//     res.send('Error refreshing access token');
//   }
// });

app.get("/quizz", async (req, res) => {
  const course_id = "18511";

  const options = {
    method: "GET",
    url: `https://ilearn.onlinelearningbc.com/d2l/api/le/1.66/${course_id}/quizzes/`,
    headers: {
      Authorization: `Bearer ${process.env.accessToken}`,
    },
    json: true,
  };

  console.log(options);
  try {
    request(options, (error, response, body) => {
      if (error) {
        console.error("Error:", error);
        return;
      }

      if (response.statusCode !== 200) {
        console.error(
          `Status: ${response.statusCode} - ${response.statusMessage}`
        );
        if (response.statusCode == 401) {
          const redirectUri = encodeURIComponent(
            `${req.protocol}://${req.get("host")}${req.originalUrl}`
          );
          console.log("Redirect URI: " + redirectUri);
          res.redirect(`/auth?redirect=${redirectUri}`);
        }

        // console.error('Error:', response);
        return;
      }
      res.send(body);
      console.log(body);
    });
  } catch (error) {
    console.error("API Error:", error.message);
    res.send("Failed to retrieve response from API");
  }
});

app.listen(3004, () => {
  console.log("Server started on port 3004");
});

module.exports = app;
