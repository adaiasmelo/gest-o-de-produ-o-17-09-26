importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// O Firebase Applet Config será lido do ambiente se possível, mas aqui precisamos passar hardcoded ou de alguma forma dinâmica.
// Como somos um builder, podemos ler do arquivo gerado.
// NOTA: No ambiente real, o build process pode injetar isso ou o PWA plugin pode lidar.
// Para simplicidade e seguindo as instruções de PWA, vou assumir o uso do messaging padrão.

firebase.initializeApp({
  apiKey: "AIzaSyCTtHT3OE8e8i54nNCLP5RPS8rxCPsLk2I",
  authDomain: "gen-lang-client-0007395511.firebaseapp.com",
  projectId: "gen-lang-client-0007395511",
  storageBucket: "gen-lang-client-0007395511.firebasestorage.app",
  messagingSenderId: "871504330675",
  appId: "1:871504330675:web:8a10f2c147935e3f9555c6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', JSON.stringify(payload, null, 2));
  
  // Extrai dados tanto do objeto notification quanto do objeto data (para maior compatibilidade)
  const notificationTitle = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Manupackaging';
  const notificationBody = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';
  
  const notificationOptions = {
    body: notificationBody,
    icon: (payload.notification && payload.notification.icon) || 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
    badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
    image: (payload.notification && payload.notification.image) || undefined,
    tag: (payload.data && payload.data.id) || 'msg-' + Date.now(),
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Marcar como Lida' }
    ],
    data: {
      url: self.location.origin,
      ...payload.data
    }
  };

  // Atualiza o Badge no ícone do app
  if (self.navigator && 'setAppBadge' in self.navigator) {
    self.registration.getNotifications().then(notifications => {
      const count = notifications.length + 1;
      self.navigator.setAppBadge(count).catch(function(e) {
        console.error('Erro ao definir badge:', e);
      });
    });
  }

  console.log('[firebase-messaging-sw.js] Exibindo notificação:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  
  notification.close();
  
  if (action === 'dismiss') {
    // Reduzir o badge se possível
    if (self.navigator && 'clearAppBadge' in self.navigator) {
       self.registration.getNotifications().then(notifications => {
         if (notifications.length === 0) {
           self.navigator.clearAppBadge().catch(function() {});
         } else {
           self.navigator.setAppBadge(notifications.length).catch(function() {});
         }
       });
    }
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        if (self.navigator && 'clearAppBadge' in self.navigator) {
          self.navigator.clearAppBadge().catch(function() {});
        }
        return client.focus();
      }
      if (self.navigator && 'clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(function() {});
      }
      return clients.openWindow('/');
    })
  );
});
