// ai-patterns.js
// cSpell:words phind huggingface writesonic rytr frase grammarly wordtune quillbot sudowrite hyperwriteai midjourney ideogram canva runwayml synthesia heygen descript luma pika invideo pictory fliki lumen elevenlabs murf resemble suno udio replika janitorai codeium tabnine replit sourcegraph askcodi fireflies tldv slidesai dataiku deepseek groq feedhive hootsuite taplio clearscope adcreative kickresume enhancv textio

export const AI_PATTERNS = [
  // Major AI Platforms
  '*://openai.com/*',
  '*://chat.openai.com/*',
  '*://chatgpt.com/*',
  '*://*.openai.com/*',
  '*://www.chatgpt.com/*',
  '*://platform.openai.com/*',
  '*://beta.openai.com/*',
  
  // Google AI Services
  '*://gemini.google.com/*',
  '*://bard.google.com/*',
  '*://ai.google/*',
  '*://ai.google.com/*',
  '*://ai.google.dev/*',
  '*://makersuite.google.com/*',
  '*://aistudio.google.com/*',
  '*://deepmind.com/*',
  '*://*.deepmind.com/*',
  
  // Anthropic (Claude)
  '*://anthropic.com/*',
  '*://*.anthropic.com/*',
  '*://claude.ai/*',
  '*://*.claude.ai/*',
  
  // Search AI
  '*://perplexity.ai/*',
  '*://*.perplexity.ai/*',
  '*://www.perplexity.ai/*',
  '*://you.com/*',
  '*://*.you.com/*',
  '*://phind.com/*',
  '*://*.phind.com/*',
  '*://consensus.app/*',
  '*://*.consensus.app/*',
  
  // AI Development Platforms
  '*://huggingface.co/*',
  '*://*.huggingface.co/*',
  '*://replicate.com/*',
  '*://*.replicate.com/*',
  '*://cohere.ai/*',
  '*://*.cohere.ai/*',
  '*://ai21.com/*',
  '*://*.ai21.com/*',
  
  // AI Writing Tools
  '*://jasper.ai/*',
  '*://*.jasper.ai/*',
  '*://copy.ai/*',
  '*://*.copy.ai/*',
  '*://writesonic.com/*',
  '*://*.writesonic.com/*',
  '*://rytr.me/*',
  '*://*.rytr.me/*',
  '*://frase.io/*',
  '*://*.frase.io/*',
  '*://grammarly.com/*',
  '*://*.grammarly.com/*',
  '*://wordtune.com/*',
  '*://*.wordtune.com/*',
  '*://quillbot.com/*',
  '*://*.quillbot.com/*',
  '*://sudowrite.com/*',
  '*://*.sudowrite.com/*',
  '*://hyperwriteai.com/*',
  '*://*.hyperwriteai.com/*',
  
  // AI Image Generation
  '*://midjourney.com/*',
  '*://*.midjourney.com/*',
  '*://stability.ai/*',
  '*://*.stability.ai/*',
  '*://leonardo.ai/*',
  '*://*.leonardo.ai/*',
  '*://ideogram.ai/*',
  '*://*.ideogram.ai/*',
  '*://adobe.com/firefly*',
  '*://firefly.adobe.com/*',
  '*://canva.com/magic*',
  '*://designer.microsoft.com/*',
  
  // AI Video Generation
  '*://runwayml.com/*',
  '*://*.runwayml.com/*',
  '*://synthesia.io/*',
  '*://*.synthesia.io/*',
  '*://heygen.com/*',
  '*://*.heygen.com/*',
  '*://descript.com/*',
  '*://*.descript.com/*',
  '*://luma.ai/*',
  '*://*.luma.ai/*',
  '*://pika.art/*',
  '*://*.pika.art/*',
  '*://invideo.io/*',
  '*://*.invideo.io/*',
  '*://pictory.ai/*',
  '*://*.pictory.ai/*',
  '*://fliki.ai/*',
  '*://*.fliki.ai/*',
  '*://lumen5.com/*',
  '*://*.lumen5.com/*',
  
  // AI Voice/Audio
  '*://elevenlabs.io/*',
  '*://*.elevenlabs.io/*',
  '*://murf.ai/*',
  '*://*.murf.ai/*',
  '*://play.ht/*',
  '*://*.play.ht/*',
  '*://resemble.ai/*',
  '*://*.resemble.ai/*',
  '*://suno.ai/*',
  '*://*.suno.ai/*',
  '*://udio.com/*',
  '*://*.udio.com/*',
  
  // Conversational AI
  '*://character.ai/*',
  '*://*.character.ai/*',
  '*://replika.ai/*',
  '*://*.replika.ai/*',
  '*://poe.com/*',
  '*://*.poe.com/*',
  '*://pi.ai/*',
  '*://*.pi.ai/*',
  '*://janitorai.com/*',
  '*://*.janitorai.com/*',
  
  // AI Coding Assistants
  '*://github.com/copilot*',
  '*://copilot.github.com/*',
  '*://cursor.sh/*',
  '*://*.cursor.sh/*',
  '*://codeium.com/*',
  '*://*.codeium.com/*',
  '*://tabnine.com/*',
  '*://*.tabnine.com/*',
  '*://replit.com/*',
  '*://*.replit.com/*',
  '*://sourcegraph.com/cody*',
  '*://askcodi.com/*',
  '*://*.askcodi.com/*',
  
  // AI Productivity
  '*://notion.so/ai*',
  '*://notion.com/ai*',
  '*://otter.ai/*',
  '*://*.otter.ai/*',
  '*://fireflies.ai/*',
  '*://*.fireflies.ai/*',
  '*://tldv.io/*',
  '*://*.tldv.io/*',
  '*://mem.ai/*',
  '*://*.mem.ai/*',
  '*://personal.ai/*',
  '*://*.personal.ai/*',
  
  // AI Presentations
  '*://gamma.app/*',
  '*://*.gamma.app/*',
  '*://tome.app/*',
  '*://*.tome.app/*',
  '*://beautiful.ai/*',
  '*://*.beautiful.ai/*',
  '*://slidesai.io/*',
  '*://*.slidesai.io/*',
  '*://presentations.ai/*',
  '*://*.presentations.ai/*',
  
  // Enterprise AI
  '*://c3.ai/*',
  '*://*.c3.ai/*',
  '*://databricks.com/*',
  '*://*.databricks.com/*',
  '*://dataiku.com/*',
  '*://*.dataiku.com/*',
  '*://h2o.ai/*',
  '*://*.h2o.ai/*',
  '*://scale.com/*',
  '*://*.scale.com/*',
  
  // Microsoft AI
  '*://microsoft.com/ai*',
  '*://azure.microsoft.com/ai*',
  '*://copilot.microsoft.com/*',
  '*://bing.com/chat*',
  '*://*.bing.com/chat*',
  
  // IBM AI
  '*://ibm.com/watson*',
  '*://watson.ibm.com/*',
  '*://*.watson.ibm.com/*',
  
  // AI Research
  '*://deepseek.com/*',
  '*://*.deepseek.com/*',
  '*://groq.com/*',
  '*://*.groq.com/*',
  '*://together.ai/*',
  '*://*.together.ai/*',
  '*://fireworks.ai/*',
  '*://*.fireworks.ai/*',
  
  // AI Social Media
  '*://feedhive.com/*',
  '*://*.feedhive.com/*',
  '*://vista.social/*',
  '*://*.vista.social/*',
  '*://hootsuite.com/ai*',
  '*://buffer.com/ai*',
  '*://taplio.com/*',
  '*://*.taplio.com/*',
  
  // AI SEO & Marketing
  '*://surfer.com/*',
  '*://*.surfer.com/*',
  '*://frase.io/*',
  '*://*.frase.io/*',
  '*://clearscope.io/*',
  '*://*.clearscope.io/*',
  '*://adcreative.ai/*',
  '*://*.adcreative.ai/*',
  
  // AI Customer Service
  '*://tidio.com/*',
  '*://*.tidio.com/*',
  '*://intercom.com/ai*',
  '*://zendesk.com/ai*',
  
  // AI Resume/HR
  '*://teal.com/*',
  '*://*.teal.com/*',
  '*://kickresume.com/*',
  '*://*.kickresume.com/*',
  '*://enhancv.com/*',
  '*://*.enhancv.com/*',
  '*://textio.com/*',
  '*://*.textio.com/*'
];

export const GMAIL_PATTERNS = [
  '*://mail.google.com/*',
  '*://gmail.com/*',
  '*://*.gmail.com/*',
  '*://www.gmail.com/*'
];
