/**
 * Controle de Ponto - Aplicação Modularizada
 * 
 * Os scripts foram 100% reorganizados e modularizados em arquivos dedicados na pasta /js:
 * - js/constants.js    (Constantes, horários padrão e chaves de storage)
 * - js/utils.js        (Formatações de datas, horários e cálculos de minutos)
 * - js/storage.js      (Estado reativo da aplicação e persistência em LocalStorage)
 * - js/audio.js        (Efeitos sonoros e feedback háptico/vibração)
 * - js/calculations.js (Regras de negócio de jornada, dedução de almoço e saída prevista)
 * - js/pwa.js          (Service Worker, atualizações e sistema de toasts)
 * - js/logs.js         (Histórico de batidas e exportação para CSV)
 * - js/settings.js     (Modal de configurações de jornada, horários e links)
 * - js/backup.js       (Exportação, importação e restauração de dados JSON)
 * - js/push.js         (Notificações Push web via Cloudflare Worker)
 * - js/ui-board.js     (Renderização do quadro, slots interativos, orbes e badges)
 * - js/app.js          (Ponto de entrada que inicializa a aplicação)
 */
console.log('Controle de Ponto carregado com arquitetura modular em /js.');
