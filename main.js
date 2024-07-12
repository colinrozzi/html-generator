const http = require("http");
const fs = require("fs");
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
              console.log("The file has been saved!");
            }
          });
        }
      });
    }
  });
}

// Create an instance of the http server to handle HTTP requests
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("okay");
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
    const data = JSON.parse(message);
    if (data.action === "prompt") {
      makeHtml(data.input).then((html) => {
        console.log("html", html);
        writeToFile(html);
      });
    }
  });
});
