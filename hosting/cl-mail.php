<?php
/* 苍岚战纪 —— 发验证码邮件的小脚本
 *
 * 放在 StartHost 主机上任意一个网站目录里（例如 wuyu.991828.xyz 的 public_html），
 * 游戏后端（Cloudflare）带着密钥来调用它，它就给玩家发一封验证码邮件。
 *
 * 用之前只需要改下面第一行：把 $KEY 换成你自己编的一长串随机字符（至少 32 位，字母数字混着来），
 * 然后在 Cloudflare Pages 项目的「变量和机密」里把同一串填进 MAIL_KEY。
 *
 * 它只会发固定格式的 6 位数字验证码邮件，不能拿来发别的内容。
 */
$KEY  = 'CHANGE_ME';                 // ← 改成你自己的密钥
$FROM = 'noreply@991828.xyz';        // 发件邮箱（主机面板里已经建好的只发不收邮箱）
$NAME = '苍岚战纪';                   // 发件人显示的名字
$MAX_PER_HOUR = 120;                 // 每小时最多发多少封，防止被刷

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function out($code, $arr) { http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'POST only']);
if ($KEY === 'CHANGE_ME' || strlen($KEY) < 32) out(500, ['error' => 'key not set']);
$given = isset($_SERVER['HTTP_X_MAIL_KEY']) ? $_SERVER['HTTP_X_MAIL_KEY'] : '';
if (!hash_equals($KEY, $given)) out(403, ['error' => 'forbidden']);

$in = json_decode(file_get_contents('php://input'), true);
$to = isset($in['to']) ? trim($in['to']) : '';
$code = isset($in['code']) ? (string)$in['code'] : '';
$minutes = isset($in['minutes']) ? max(1, min(60, (int)$in['minutes'])) : 10;
if (!filter_var($to, FILTER_VALIDATE_EMAIL) || strlen($to) > 120 || preg_match('/[\r\n]/', $to)) out(400, ['error' => 'bad address']);
if (!preg_match('/^\d{6}$/', $code)) out(400, ['error' => 'bad code']);

// 简单限流：按小时计数，记在系统临时目录
$f = sys_get_temp_dir() . '/clmail_' . md5(__FILE__) . '_' . date('YmdH');
$n = (int)@file_get_contents($f);
if ($n >= $MAX_PER_HOUR) out(429, ['error' => 'too many']);
@file_put_contents($f, $n + 1, LOCK_EX);

$b64 = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };
$subject = $b64("【{$NAME}】验证码 {$code}");
$body = "你正在重设《{$NAME}》的登录密码。\r\n\r\n验证码：{$code}\r\n\r\n{$minutes} 分钟内有效。如果不是你本人操作，忽略这封邮件即可，密码不会被修改。\r\n";
$headers = implode("\r\n", [
  'From: ' . $b64($NAME) . " <{$FROM}>",
  "Reply-To: {$FROM}",
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
]);
$ok = @mail($to, $subject, chunk_split(base64_encode($body)), $headers, '-f' . $FROM);
if (!$ok) out(500, ['error' => 'send failed']);
out(200, ['ok' => true]);
