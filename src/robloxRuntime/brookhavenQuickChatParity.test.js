import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: Quick Chat',()=>{
  it('server-validates the current Brookhaven phrase and emoji option set',()=>{
    const service=read('roblox/src/server/QuickChatService.luau');

    for(const phrase of [
      'Thank you','Sorry','Ready to go','Be my parent',
      'Be my child','Follow me','Look here','Stop'
    ]){
      expect(service).toContain('"'+phrase+'"');
    }
    for(const emoji of ['😁','😂','😭','❤️','👍','👎','😡','💀','🤨','💤','😎','🤓','🥱','🤡','🥀','💩','👏']){
      expect(service).toContain('"'+emoji+'"');
    }
    expect(service).toContain('local COOLDOWN_SECONDS = 10');
    expect(service).toContain('ALLOWED[value] ~= true');
    expect(service).toContain('code = "quick_chat_cooldown"');
    expect(service).toContain('self._message:FireAllClients');
  });

  it('renders a distinct blue Quick Chat bubble and prefixed log entry',()=>{
    const client=read('roblox/src/client/QuickChat.client.luau');

    expect(client).toContain('bubble.Name = "StarBloxQuickChatBubble"');
    expect(client).toContain('Color3.fromRGB(69, 171, 235)');
    expect(client).toContain('bolt.Text = "⚡"');
    expect(client).toContain('[Quick Chat] %s: %s');
    expect(client).toContain('general:DisplaySystemMessage');
  });

  it('uses Brookhaven phrase and emoji categories instead of ordinary SendAsync chat',()=>{
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(shell).toContain('quickChatGetOptions:InvokeServer()');
    expect(shell).toContain('quickChatSend:InvokeServer(value)');
    expect(shell).toContain('{Id = "phrases", Symbol = "Aa"}');
    expect(shell).toContain('{Id = "emojis", Symbol = "☺"}');
    expect(shell).toContain('result.code == "quick_chat_cooldown"');
    expect(shell).not.toContain('general:SendAsync(message)');
  });

  it('boots and cleans Quick Chat with the server runtime',()=>{
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(bootstrap).toContain('QuickChatService.new()');
    expect(bootstrap).toContain('quickChat:PlayerRemoving(player)');
    expect(bootstrap).toContain('quickChat:Destroy()');
    expect(bootstrap).toContain('QuickChat = quickChat');
  });
});
