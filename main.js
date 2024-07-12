const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const WebSocket = require("ws");

async function makeHtml(prompt) {
  const messages = [
    {
      role: "system",
      content:
        "<context>You are a programmer. Your job is to create html pages for users.</context> \
      <instructions>Think through the structure of the page and how it is best to create the page. \
      wrap your thinking in <thinking></thinking> tags. The page will not have a server side component, \
      so any functionality will need to be client side. When you are finished thinking, wrap the code in \
      <file> code goes here </file> tags, so that it can be exctracted easily </instructions>",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("http://localhost:3000", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const data = await response.json();
  console.log(data);
  const textResponse = data.response.content;
  console.log(textResponse);
  // extract the code inside the <file> tags
  const html = textResponse.match(/<file>([\s\S]*?)<\/file>/)[1];
  console.log(html);
  return html;
}

function writeToFile(html) {
  fs.readFile("./files/num", "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const num = parseInt(data);
      console.log("num", num);
      // write the new number to the file
      // convert the number to a string
      const newNum = num + 1;
      fs.writeFile("./files/num", newNum.toString(), (err) => {
        if (err) {
          console.log(err);
        } else {
          fs.writeFile(`./files/${num}.html`, html, (err) => {
            if (err) {
              console.log(err);
            } else {
              sendToStatic(html, num);
              console.log("The file has been saved!");
            }
          });
        }
      });
    }
  });
}

async function sendToStatic(html, name) {
  const response = await fetch("http://localhost:3009", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: html, filename: name }),
  });
  const data = await response.json();
  console.log(data);
}

// Create an instance of the http server to handle HTTP requests
const server = http.createServer((req, res) => {
  const { method, url } = req;
  if (method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
  } else if (method === "POST" && url === "/") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const data = JSON.parse(body);
      console.log(data);
      if (data.action === "prompt") {
        makeHtml(data.input).then((html) => {
          const hash = crypto.createHash("sha256").update(html).digest("hex");
          sendToStatic(html, hash).then(() => {
            console.log("success");
            console.log(hash);
            res.writeHead(200, {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ message: "Success", filename: hash }));
            return;
          });
        });
      } else {
        res.writeHead(500, {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Error" }));
      }
    });
  }
});

// Start the server on port 3015
server.listen(3015);
console.log("Node server running on port 3015");

const wss = new WebSocket.Server({ server });
let clients = [];
wss.on("connection", function connection(ws) {
  clients.push(ws);
  console.log("connected");
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });
});
