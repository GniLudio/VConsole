# VConsole

Connect to the VConsole.

```mts
import { VConsole } from "./vconsole.mts";

const vconsole = new VConsole();
vconsole.onPRNT = (event, content) => console.log(content.channel, content.message);
await vconsole.connect();
await vconsole.execute("echo Hello vconsole.mts");
```
