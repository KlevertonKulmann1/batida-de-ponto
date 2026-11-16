/**
 * Controle de Ponto - Constantes e Configurações Globais
 */

const DEFAULT_SCHEDULE = {
  segunda: { label: 'Segunda', times: ['08:00', '08:15', '08:45', '11:00', '11:30', '17:00', '18:00', '20:00'] },
  terca:   { label: 'Terça',   times: ['08:00', '18:00'] },
  quarta:  { label: 'Quarta',  times: ['08:00', '08:15', '08:45', '11:00', '11:30', '17:00', '18:00', '20:00'] },
  quinta:  { label: 'Quinta',  times: ['08:00', '18:00'] },
  sexta:   { label: 'Sexta',   times: ['08:00', '17:00', '18:00', '19:00'] },
  sabado:  { label: 'Sábado',  times: [] },
  domingo: { label: 'Domingo', times: [] }
};

const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

const IMAGES = {
  orbAberta: 'assets/batida-aberta.png',
  orbCorreta: 'assets/batida-correta.png',
  orbFaltando: 'assets/batida-faltando.png',
  slotNaoMarcado: 'assets/nao-marcado.png',
  slotMarcado: 'assets/marcado.png'
};

const STORAGE_KEYS = {
  schedule: 'ponto_schedule_v1',
  records: 'ponto_records_v1',
  logs: 'ponto_logs_v1',
  sound: 'ponto_sound_v1',
  redirectUrl: 'ponto_redirect_url_v1',
  pushWorkerUrl: 'ponto_push_worker_url_v1',
  pushSubscribed: 'ponto_push_subscribed_v1',
  dailyWorkload: 'ponto_daily_workload_v1',
  lunchBreak: 'ponto_lunch_break_v1'
};

const VAPID_PUBLIC_KEY = 'BMByAAvpIK5HGGYz8_68rjv6oNv7UmKogE7QrVmrkOkgar0CLFl6Cqa0YvxSM-i5r6lF6FNOBdnykOZgnOY2Kag';
