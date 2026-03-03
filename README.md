# VConsole

Connect to the VConsole.

```mts
const vconsole = new VConsole2();
vconsole.onPRNT = (event, content) => console.log(content.channel, content.message);
await vconsole.connect();
await vconsole.execute("echo Hello vconsole2.mts");
```
