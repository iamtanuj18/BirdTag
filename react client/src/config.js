const config = {
  cognito: {
    domain: "https://birdtag-group-113.auth.us-east-1.amazoncognito.com",
    clientId: "34u65gj4hm3vr9h2hpp95goqm3",
    redirectUri: "http://localhost:5173/home",
    scope: "openid profile email",
    responseType: "token",
  },

  apiGateway: {
    url: "https://d58sgxm4wk.execute-api.us-east-1.amazonaws.com/prod", // Your API Gateway Invoke URL
  },
};

export default config;
