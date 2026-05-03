export default async (request, context) => {
  const upgrade = request.headers.get("upgrade") || "";
  
  // 1. معالجة اتصالات V2Ray (WebSocket)
  if (upgrade.toLowerCase() === "websocket") {
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(request);
    
    const targetUrl = new URL(request.url);
    targetUrl.hostname = "wathfor.alwaysdata.net";
    targetUrl.port = "443";
    targetUrl.protocol = "wss:";
    
    // تمرير بروتوكولات V2Ray الفرعية إن وجدت حتى ميرفضها السيرفر
    const secProtocol = request.headers.get("sec-websocket-protocol");
    const targetSocket = secProtocol 
        ? new WebSocket(targetUrl.toString(), secProtocol)
        : new WebSocket(targetUrl.toString());

    // السر هنا: إخبار السيرفرين أن البيانات مشفرة (Binary) وليست نصوص
    clientSocket.binaryType = "arraybuffer";
    targetSocket.binaryType = "arraybuffer";

    let messageQueue = [];
    
    targetSocket.onopen = () => {
      while (messageQueue.length > 0) {
        targetSocket.send(messageQueue.shift());
      }
    };

    clientSocket.onmessage = (e) => {
      if (targetSocket.readyState === 1) { // 1 = OPEN
        targetSocket.send(e.data);
      } else {
        messageQueue.push(e.data);
      }
    };
    
    targetSocket.onmessage = (e) => {
      if (clientSocket.readyState === 1) {
        clientSocket.send(e.data);
      }
    };

    clientSocket.onclose = () => targetSocket.close();
    targetSocket.onclose = () => clientSocket.close();
    clientSocket.onerror = () => targetSocket.close();
    targetSocket.onerror = () => clientSocket.close();
    
    return response;
  }

  // 2. معالجة الطلبات العادية (HTTP)
  const url = new URL(request.url);
  url.hostname = "wathfor.alwaysdata.net";
  url.protocol = "https:";
  
  const headers = new Headers(request.headers);
  headers.set("Host", "wathfor.alwaysdata.net");
  
  const newReq = new Request(url.toString(), {
    method: request.method,
    headers: headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "manual",
  });
  
  try {
    return await fetch(newReq);
  } catch (err) {
    return new Response("Proxy Error", { status: 502 });
  }
};
