/* محتوى خطة تنمويين مصر لتحسين وتطوير اللغة الإنجليزية: المهام، المحطات، المحتوى اليومي، الاختبارات، القاموس، الرسايل */
const TOTAL = 56;
const TASKS = [
  {k:"a", t:"نطق وShadowing", m:15, d:"اسمع جملة النهارده وكررها وراه"},
  {k:"f", t:"استماع من مجالنا", m:20, d:"حلقة قصيرة عن التنمية"},
  {k:"b", t:"عبارات النهارده", m:10, d:"عبارتين جداد بنطقهم ومعناهم"},
  {k:"c", t:"قاعدة المحطة", m:10, d:"تمرين قصير على القاعدة"},
  {k:"g", t:"قراءة بصوت عالي", m:15, d:"نص قصير تسمعه وتقراه وتلخّصه"},
  {k:"d", t:"كلام مسجّل", m:20, d:"سجّل صوتك وانت بتجاوب سؤال النهارده"},
  {k:"h", t:"محادثة مع Claude", m:20, d:"محادثة بطلب جاهز تنسخه"},
  {k:"e", t:"مراجعة", m:10, d:"غلطة النهارده وتصحيحها"}
];
const N = TASKS.length, MIN = TASKS.reduce((a,t)=>a+t.m,0);

const WEEKS = [
  {t:"تقديم نفسك ومنظمتك", snd:"/θ/ و /ð/ — think, three, the, community", gr:"Present simple vs continuous", sp:"عرّف نفسك ومنظمتك ورسالتها وأهم برامجها في دقيقتين، بدون ورقة.",
   ph:[["Our organisation works to…","منظمتنا بتشتغل على…"],["We focus on youth, women and vulnerable communities.","بنركز على الشباب والستات والمجتمعات الأكثر احتياجًا."],["We operate in five governorates across Egypt.","بنشتغل في ٥ محافظات في مصر."],["Currently, we're implementing a project on…","حاليًا بننفذ مشروع عن…"],["My role covers…","دوري بيشمل…"],["What drives our work is…","اللي بيحرك شغلنا هو…"]],
   ses:"Let's do my week 1 English speaking session. You are a staff member from an international NGO meeting me for the first time at a development sector networking event. Ask me about myself, my organisation, its mission and programmes, one question at a time. After each answer, correct my grammar and suggest a more natural way to say it. At the end, give me 5 phrases I should start using."},
  {t:"شرح مشروع تنموي", snd:"/p/ و /b/ — project, problem, beneficiaries, public", gr:"Purpose & cause: in order to, so that, due to, as a result of", sp:"اشرح مشروع: المشكلة، الفئة المستهدفة، الأنشطة، والتغيير المتوقع.",
   ph:[["The project aims to…","المشروع بيهدف إلى…"],["The main problem we're addressing is…","المشكلة الأساسية اللي بنتعامل معاها…"],["Our target group is…","الفئة المستهدفة…"],["Key activities include…","أهم الأنشطة…"],["In order to achieve this, we…","عشان نحقق ده، بنعمل…"],["By the end of the project, we expect…","مع نهاية المشروع، متوقعين…"]],
   ses:"Let's do my week 2 English speaking session. You are a programme officer at an international foundation. Ask me to explain a development project: the problem, target group, activities, expected change and sustainability. Ask follow-up questions like a real funder would. After each answer, correct my grammar and suggest clearer wording. End with 5 better phrases."},
  {t:"الاجتماعات والتنسيق مع الشركاء", snd:"/v/ و /f/ — village, volunteer, field, focus", gr:"Modal verbs: should, could, might, would", sp:"افتح اجتماع تنسيق مع شركاء: الأجندة، النقطة الأولى، واطلب رأي حد. بعدها اعترض بأدب على اقتراح.",
   ph:[["Shall we get started?","نبدأ؟"],["Could I just come in here?","ممكن أتدخل هنا؟"],["I see your point, but…","فاهم وجهة نظرك، بس…"],["Let's park that for now and come back to it.","نأجل النقطة دي ونرجعلها."],["How can we avoid duplication between partners?","إزاي نتجنب التكرار بين الشركاء؟"],["Who's going to take this forward?","مين هيمسك النقطة دي؟"]],
   ses:"Let's do my week 3 English speaking session. Role-play a partner coordination meeting for a development programme. You play two local partner representatives who disagree about how to divide activities across governorates. I chair the meeting. Interrupt me sometimes so I practise managing the discussion. After every 3 exchanges, give me feedback on grammar, modal verbs and politeness. End with 5 meeting phrases I missed."},
  {t:"المتابعة والتقييم والنتائج", snd:"نبرة الكلمة — inDIcator, beneFIciary, sustainaBIlity, evaLUation", gr:"Comparatives & describing change (increased by / rose to)", sp:"اشرح نتائج مشروع بالأرقام: المؤشرات، خط الأساس، اللي اتحقق، والدروس المستفادة.",
   ph:[["We reached 2,400 beneficiaries, 60% of them women.","وصلنا لـ٢٤٠٠ مستفيد، ٦٠٪ منهم ستات."],["Compared to the baseline, … increased by…","مقارنة بخط الأساس، … زاد بنسبة…"],["The indicator shows that…","المؤشر بيوضح إن…"],["One key lesson learned is…","من أهم الدروس المستفادة…"],["The evaluation found that…","التقييم لقى إن…"],["To ensure sustainability, we…","عشان نضمن الاستدامة، …"]],
   ses:"Let's do my week 4 English speaking session. You are an external evaluator conducting a final evaluation interview with me about a development project. Ask about results, indicators, challenges, lessons learned and sustainability, one at a time. After each answer, correct how I describe numbers and changes, and my grammar. End with a score out of 10 for clarity."},
  {t:"العرض والتقديم في الفعاليات", snd:"نبرة الجملة والتنغيم — شدّد على الكلمة المهمة", gr:"Passive voice (was launched, has been implemented)", sp:"قدّم عرض ٣ دقائق عن مشروع أو قصة نجاح في مؤتمر، مع مقدمة وخاتمة واضحة.",
   ph:[["Today I'd like to share our experience in…","النهارده عايز أشارككم تجربتنا في…"],["Let me start with a short story.","خليني أبدأ بقصة قصيرة."],["The programme was launched in 2024 and has been implemented in…","البرنامج بدأ في ٢٠٢٤ واتنفذ في…"],["The key takeaway here is…","أهم رسالة هنا…"],["To sum up…","باختصار…"],["I'm happy to take any questions.","أنا موجود لأي أسئلة."]],
   ses:"Let's do my week 5 English speaking session. I will present a 3-minute talk about a development programme at a regional conference. Listen to my talk, then act as 2 audience members and ask me 3 challenging questions. Then give me feedback on structure, storytelling, signposting, passive voice, and anything that sounded unnatural. End with a rewritten version of my opening and closing."},
  {t:"المقترحات والتفاوض مع المانحين", snd:"ربط الكلمات — an_impact, set_up, carry_out", gr:"First & second conditionals", sp:"اعرض فكرة مشروع على مانح في دقيقتين (pitch)، وبعدين فاوض على تعديل المدة أو الأنشطة.",
   ph:[["We'd like to propose a project that…","حابين نقترح مشروع…"],["This aligns with your priorities on…","ده متوافق مع أولوياتكم في…"],["If we receive funding, we'll be able to…","لو اتمولنا، هنقدر…"],["Would you be open to…?","ممكن تكونوا منفتحين على…؟"],["Let me be transparent about the challenges.","خليني أكون واضح بخصوص التحديات."],["Can we find a middle ground?","نقدر نوصل لحل وسط؟"]],
   ses:"Let's do my week 6 English speaking session. You are a donor representative. First, I'll pitch a new project idea in 2 minutes. Then ask me tough questions about relevance, partnerships and sustainability. After that, I'll negotiate a 3-month extension; resist at first. Correct my conditionals and suggest more diplomatic phrasing after each turn. End by telling me where I sounded too direct or too weak."},
  {t:"المقابلات والقيادة", snd:"تقليل الحشو — بدّل \"eeh\" بوقفة قصيرة صامتة", gr:"Past continuous & narrative tenses for STAR stories", sp:"احكي قصة STAR عن موقف صعب في الشغل التنموي: الموقف، المهمة، اللي عملته، والنتيجة.",
   ph:[["At the time, I was leading…","وقتها كنت بقود…"],["The challenge was that…","التحدي كان إن…"],["What I did was…","اللي عملته إني…"],["As a result, …","والنتيجة…"],["What I learned from this is…","اللي اتعلمته من ده…"],["That's a great question — let me think for a second.","سؤال حلو، اديني ثانية أفكر."]],
   ses:"Let's do my week 7 English speaking session. Conduct a mock interview for a senior management role at an international development or humanitarian NGO. Ask 6 behavioural and technical questions (programme quality, partnerships, team leadership, compliance, working with communities), one at a time. After each answer, rate it out of 10, point out filler words or grammar slips, and suggest a stronger STAR structure."},
  {t:"قضايا التنمية والتثبيت", snd:"قارن تسجيلك النهارده بتسجيل الأسبوع الأول", gr:"Expressing opinions & agreeing/disagreeing", sp:"اتكلم ٣ دقايق عن رأيك في قضية تنموية (التوطين، تمكين الستات، تشغيل الشباب، المناخ)، وبعدين أعد تسجيل الأسبوع الأول وقارن.",
   ph:[["In my view, the biggest challenge is…","من وجهة نظري، أكبر تحدي…"],["Localisation means…","التوطين معناه…"],["There's a growing need for…","فيه احتياج متزايد لـ…"],["I partly agree, but…","متفق جزئيًا، بس…"],["Looking back, I've noticed that…","وأنا ببص لورا، لاحظت إن…"],["Moving forward, we should prioritise…","الفترة الجاية لازم نركز على…"]],
   ses:"Let's do my final week 8 English speaking session. Have a free 15-minute discussion with me about current development issues (localisation, aid cuts, youth employment, climate, gender). Challenge my opinions sometimes. At the end, give me an honest assessment of my fluency, grammar and vocabulary on a CEFR-style scale, list my 5 most repeated mistakes, and suggest a 4-week maintenance routine."}
];

const YT = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
const EXTRA = [
  {ex:"Hi, I'm {name}. I work as a programme coordinator at a local development organisation in Egypt. Our organisation works to create opportunities for young people and women in vulnerable communities. We support them through training, small grants and partnerships with local NGOs. Currently, we're implementing a project on youth employment in two governorates. My role covers planning, follow-up with partners and reporting, but what drives me is seeing real change in people's lives.",
   v:[["نطق صوت TH (Rachel's English)","Rachel's English TH sound"],["تقديم نفسك ومنظمتك","how to introduce your organization in English NGO"],["Present simple vs continuous","BBC Learning English present simple present continuous"]]},
  {ex:"The project aims to improve employment opportunities for young people in Upper Egypt. The main problem we're addressing is the gap between what young people learn and what the local market needs. Our target group is 1,500 young women and men aged 18 to 29. Key activities include vocational training, coaching and internships with local businesses. In order to make this sustainable, we work with local NGOs so that they can continue the services after the project ends.",
   v:[["شرح نظرية التغيير","theory of change explained simply"],["عبارات الهدف والسبب","in order to so that English grammar lesson"],["صوت P و B","P and B sounds pronunciation English"]]},
  {ex:"Shall we get started? We have three items on the agenda: the work plan for next quarter, the division of governorates, and the community outreach strategy. Let's start with the work plan. Mona, could you give us a quick update? … I see your point, but I'm concerned that working in all governorates at once might affect quality. Could we start with two and expand later? How can we avoid duplication with other partners in the same area?",
   v:[["عبارات إدارة الاجتماعات","BBC Learning English meetings phrases business"],["الاعتراض بأدب","how to disagree politely in English meetings"],["صوت V و F","V and F sounds pronunciation English"]]},
  {ex:"By the end of the project, we reached 2,400 beneficiaries, sixty percent of them women. Compared to the baseline, the employment rate among participants increased from twelve to thirty-five percent. However, the indicator on women's leadership was lower than expected, mainly due to mobility challenges. The evaluation found that mentoring was the most effective activity. One key lesson learned is that we need to involve families from the start.",
   v:[["نبرة الكلمة (word stress)","word stress English pronunciation lesson"],["أساسيات المتابعة والتقييم","monitoring and evaluation basics explained"],["وصف الاتجاهات والأرقام","BBC Learning English describing trends graphs"]]},
  {ex:"Good morning, everyone. Today I'd like to share our experience in supporting women-led businesses in rural Egypt. Let me start with a short story. Two years ago, Amal was selling bread from her home. The programme was launched in 2024 and has been implemented in three governorates. Today, Amal employs four women from her village. The key takeaway here is that small, flexible grants can create real change. To sum up… I'm happy to take any questions.",
   v:[["عبارات العروض (signposting)","presentation signposting language English"],["الحكي في العروض (storytelling)","storytelling for NGOs presentation"],["المبني للمجهول","BBC Learning English passive voice"]]},
  {ex:"Thank you for your time. We'd like to propose a project that helps local organisations in Egypt access funding and manage it well. This aligns with your priorities on localisation and civil society. If we receive funding, we'll be able to train forty organisations and give small grants to twenty of them. Let me be transparent about the challenges: registration procedures can take time. If needed, would you be open to a three-month inception phase?",
   v:[["عرض فكرة مشروع (pitch)","how to pitch a project to donors"],["عبارات التفاوض","business English negotiation phrases"],["ربط الكلمات (linking)","connected speech linking English pronunciation"]]},
  {ex:"At the time, I was coordinating a project with twelve local partners. The challenge was that most partners had never managed an international grant before. What I did was design a simple coaching programme and visit each partner every month. As a result, all twelve partners submitted their reports on time, and three of them later received direct funding. What I learned from this is that capacity building needs patience and follow-up.",
   v:[["إجابات STAR في المقابلات","STAR method interview answers examples"],["مقابلات وظائف في المنظمات الدولية","NGO interview questions and answers"],["تقليل كلمات الحشو","how to stop saying um filler words English"]]},
  {ex:"In my view, the biggest challenge in our sector today is localisation. Localisation means giving local organisations more power, more direct funding and more decision-making. There's a growing need for this, especially with aid cuts. However, I partly agree with people who say local organisations need stronger systems first. Moving forward, we should prioritise long-term partnerships, not short projects.",
   v:[["التعبير عن الرأي","expressing opinions agreeing disagreeing English"],["ما هو التوطين (localization)","localization in humanitarian aid explained"],["الأخطاء الشائعة عند العرب","common English mistakes Arabic speakers"]]}
];


/* محتوى يومي: لكل محطة ٦ عبارات إضافية، ٧ نصوص قراءة، ٥ أسئلة كلام، مثالين للقاعدة، وكلمة للنطق */
const DAILY = [
 {kw:"think", topic:"introduce yourself at work",
  ph2:[["I've been working in development for five years.","بقالي ٥ سنين شغال في التنمية."],["I'm in charge of…","أنا مسؤول عن…"],["Our main donors are…","أهم المانحين بتوعنا…"],["We have a team of twenty staff and volunteers.","عندنا فريق من ٢٠ موظف ومتطوع."],["I'm passionate about…","أنا شغوف بـ…"],["Nice to meet you. What do you do?","اتشرفت بيك. بتشتغل إيه؟"]],
  rd:["My name is Sara. I work as a project officer at a community organisation in Minya. Every day, I visit villages, meet women's groups and listen to their needs. I love my job because I can see the change.",
      "Our organisation was founded in 2010. We work in education and health. We support children who left school and help them return. We also train mothers on child nutrition.",
      "In the development sector, people often ask: What does your organisation do? A good answer is short and clear. Say who you help, what you do, and why it matters.",
      "Karim is a monitoring officer. He collects data from the field every week. He checks if activities happen on time. Then he writes a short report for the project manager.",
      "Many local NGOs in Egypt work with international partners. These partners give funding and technical support. In return, local NGOs bring their knowledge of the community.",
      "At a networking event, introduce yourself in thirty seconds. Say your name, your role, and one interesting fact about your work. Then ask the other person a question.",
      "Hello, my name is Omar. I work for a youth organisation in Alexandria. We help young people find jobs through training and coaching. Currently, we are working with twenty local companies."],
  sq:["What does your organisation do, and who does it help?","Describe a normal working day for you.","What do you like most about working in development?","Introduce a colleague: their name, their role and what they do.","You meet a donor at a conference. Introduce yourself in 30 seconds."],
  gx:["I work as a project coordinator. (habit / always)","Currently, I'm preparing a report. (now)"]},
 {kw:"project", topic:"how to describe a project in English",
  ph2:[["The project runs for two years.","المشروع مدته سنتين."],["It targets women in rural areas.","بيستهدف الستات في الريف."],["We work in partnership with…","بنشتغل بالشراكة مع…"],["The expected outcome is…","النتيجة المتوقعة…"],["This will lead to…","ده هيؤدي إلى…"],["The project is funded by…","المشروع ممول من…"]],
  rd:["The project aims to reduce school dropout in Upper Egypt. It targets 3,000 children aged 8 to 14. Activities include remedial classes, school meals and awareness sessions for parents.",
      "A good project starts with a clear problem. For example, many young women cannot find jobs because they lack skills and experience. The project then explains how it will solve this problem.",
      "Our water project works in ten villages. We repair water pumps, train local committees and teach families about hygiene. As a result, children get sick less often.",
      "Every project has inputs, activities, outputs and outcomes. Inputs are money and people. Activities are what we do. Outputs are what we produce. Outcomes are the changes in people's lives.",
      "The project is funded by the European Union and implemented by three local partners. Each partner works in one governorate, so that we can reach more people.",
      "In order to make the project sustainable, we train local volunteers. After the project ends, they can continue the activities with support from the community.",
      "Our project helps small farmers in Fayoum increase their income. We train them on modern irrigation and connect them to markets. By the end of the project, we expect 500 farmers to earn twenty percent more."],
  sq:["What problem does your project solve?","Who is your target group, and why did you choose them?","Describe three main activities of your project.","What change do you expect by the end of the project?","How will the project continue after the funding ends?"],
  gx:["We train teachers in order to improve education quality.","Many children left school due to poverty."]},
 {kw:"volunteer", topic:"English for meetings",
  ph2:[["Let's go around the table.","نلف على الكل."],["Sorry, could you repeat that?","معلش ممكن تعيد؟"],["What do you mean by…?","تقصد إيه بـ…؟"],["I'd like to add something.","حابب أضيف حاجة."],["Let's summarise the action points.","نلخص المطلوب."],["Let's meet again next week.","نتقابل تاني الأسبوع الجاي."]],
  rd:["Before the meeting, the coordinator sends the agenda to all partners. The agenda has three points: activities, budget and challenges. Each partner prepares a short update.",
      "In meetings, it is normal to disagree. The important thing is to stay polite. You can say: I understand your point, but I see it differently.",
      "Coordination between partners helps avoid duplication. If two organisations work in the same village, they should share information and divide the activities.",
      "At the end of a meeting, someone should summarise the decisions. Who will do what, and by when? These are called action points.",
      "Online meetings are common now. Mute your microphone when you are not speaking, and use the chat to share links. Speak slowly and clearly.",
      "If you don't understand something in a meeting, ask. Most people prefer a question to a mistake. You could say: Sorry, could you explain that again?",
      "Good morning, everyone. Let's start. First, each partner will give a two-minute update. Then we will discuss the training schedule. Finally, we will agree on the next steps. Mona, would you like to start?"],
  sq:["Open a meeting: welcome people and present the agenda.","Politely disagree with this idea: 'We should cancel the training.'","Ask someone to explain a point you didn't understand.","Summarise the action points of a meeting you attended.","Close a meeting and agree on the next date."],
  gx:["We should share the report before Thursday.","Could you send me the attendance list?"]},
 {kw:"indicator", topic:"monitoring and evaluation explained",
  ph2:[["We collect data every month.","بنجمع بيانات كل شهر."],["The target was 500, and we reached 620.","المستهدف كان ٥٠٠ ووصلنا لـ٦٢٠."],["This is lower than expected.","ده أقل من المتوقع."],["According to the survey…","حسب الاستبيان…"],["We used focus group discussions.","استخدمنا مجموعات نقاش مركزة."],["The data shows a clear improvement.","البيانات بتوضح تحسن واضح."]],
  rd:["Monitoring means checking progress regularly. Evaluation means looking at the results at a specific time, for example in the middle or at the end of the project.",
      "An indicator is something we can measure. For example, the number of women who started a business, or the percentage of children who passed their exams.",
      "Before the project, we did a baseline survey. Only 20% of young people had a job. After two years, the number increased to 45%. This is a big improvement.",
      "Data can be quantitative, like numbers and percentages, or qualitative, like stories and opinions. Good reports use both.",
      "The evaluation found that the training was useful, but it was too short. Participants asked for more practical sessions. This is an important lesson for the next project.",
      "Beneficiary feedback is very important. We use complaint boxes, phone lines and community meetings to hear what people think about our work.",
      "Our project reached 2,400 people, more than the target of 2,000. The number of girls in school increased by fifteen percent compared to the baseline. However, attendance was lower in winter because of bad roads."],
  sq:["What is the difference between monitoring and evaluation?","Describe one indicator from your project and its result.","Compare the situation before and after your project.","Talk about one lesson you learned from a project.","How do you collect feedback from beneficiaries?"],
  gx:["The number of trained teachers increased from 40 to 75.","Results this year were better than last year."]},
 {kw:"presentation", topic:"presentation skills English",
  ph2:[["Thank you for having me.","شكرًا على استضافتي."],["I'll be brief.","هكون مختصر."],["Let me show you some numbers.","خليني أوريكم شوية أرقام."],["This brings me to my next point.","وده يوصلني للنقطة اللي بعدها."],["In conclusion…","في الختام…"],["Thank you for your attention.","شكرًا لاهتمامكم."]],
  rd:["A good presentation has three parts: an opening, a body and a closing. In the opening, say who you are and what you will talk about.",
      "Stories help people remember. Instead of only showing numbers, tell the story of one person who benefited from your project.",
      "Signposting words help the audience follow you: first, next, then, finally. They show where you are in the presentation.",
      "The training centre was opened in 2023. Since then, more than 800 young people have been trained. Most of them were hired by local companies.",
      "When you answer questions, listen to the whole question first. If you don't know the answer, it's fine to say: That's a good question. I'll check and get back to you.",
      "Practise your presentation out loud at least three times. Time yourself. Most speakers talk too fast when they are nervous, so slow down.",
      "Good afternoon. My name is Heba, and today I'll talk about our women's savings groups in Sohag. First, I'll explain the idea. Then, I'll share the results. Finally, I'll tell you about Fatma, one of our members."],
  sq:["Open a presentation: greet, introduce yourself and give the plan.","Tell the story of one person who benefited from a project.","Present three numbers from your work and explain them.","Answer this question: 'What was your biggest challenge?'","Close your presentation with a strong final message."],
  gx:["The project was launched in 2024.","More than 500 women have been trained."]},
 {kw:"impact", topic:"negotiation skills English",
  ph2:[["The call for proposals closes on…","آخر ميعاد للتقديم…"],["Our organisation has experience in…","منظمتنا عندها خبرة في…"],["We have a strong track record.","عندنا سجل نجاح قوي."],["The total requested amount is…","المبلغ المطلوب الإجمالي…"],["Could you clarify the eligibility criteria?","ممكن توضح شروط الأهلية؟"],["We are flexible on the timeline.","إحنا مرنين في الجدول الزمني."]],
  rd:["Donors publish calls for proposals. Each call explains the priorities, the budget, the eligible countries and the deadline. Read it carefully before you start writing.",
      "A concept note is a short version of the proposal, usually two to five pages. It explains the problem, the solution, the target group and the budget.",
      "Donors want to see that your project matches their priorities. Use their words in your proposal, and explain clearly how your work supports their goals.",
      "If we receive funding, we will open three new learning centres. If we had more time, we would also train teachers in neighbouring villages.",
      "Negotiation is not a fight. Both sides want the project to succeed. Be honest about challenges and come with possible solutions.",
      "After you submit a proposal, the donor may ask questions. Answer quickly and clearly. A good relationship with the donor is as important as a good proposal.",
      "Thank you for meeting us. Our organisation has ten years of experience in youth employment. We'd like to propose a project in Assiut that trains 600 young people. If we receive funding, we will start in March."],
  sq:["Pitch a project idea in one minute.","Explain why your organisation is the right partner for this project.","Ask a donor a question about the call for proposals.","Ask for a three-month extension and explain why.","Respond politely when a donor says no."],
  gx:["If we get the grant, we will hire two trainers.","If we had a bigger budget, we would work in more villages."]},
 {kw:"experience", topic:"job interview English",
  ph2:[["I have five years of experience in…","عندي ٥ سنين خبرة في…"],["One of my strengths is…","من نقاط قوتي…"],["I'm working on improving my…","بشتغل على تحسين…"],["I'm interested in this role because…","مهتم بالوظيفة دي لأن…"],["Could you tell me more about the team?","ممكن تحكيلي أكتر عن الفريق؟"],["Thank you for the opportunity.","شكرًا على الفرصة."]],
  rd:["Many NGO interviews use behavioural questions. For example: Tell me about a time when you solved a problem. The interviewer wants a real story, not a general answer.",
      "The STAR method helps you answer: Situation, Task, Action, Result. Start with the context, explain your role, describe what you did, and finish with the result.",
      "When I was working in Qena, our training was cancelled because of bad weather. I quickly moved it online and called every participant. In the end, ninety percent attended.",
      "Prepare for the interview. Read about the organisation, its projects and its values. Think about how your experience matches the job description.",
      "It's normal to pause before answering. A short silence looks more confident than 'umm'. Take a breath, think, then answer.",
      "At the end of the interview, ask one or two questions. For example: What does success look like in this role? This shows interest and preparation.",
      "At the time, I was leading a team of five facilitators. The challenge was that many women couldn't attend morning sessions. What I did was move the sessions to the afternoon and provide childcare. As a result, attendance doubled."],
  sq:["Tell me about yourself in one minute.","Why do you want to work in development?","Tell me about a time you solved a problem. Use STAR.","What is your biggest strength, and one thing you are improving?","Ask the interviewer two good questions."],
  gx:["I was working in Minya when the project started.","While we were preparing the training, the donor called."]},
 {kw:"sustainable", topic:"sustainable development explained",
  ph2:[["From my experience…","من خبرتي…"],["That's a fair point.","دي نقطة منطقية."],["On the other hand…","ومن ناحية تانية…"],["I'm not sure I agree.","مش متأكد إني متفق."],["The evidence shows that…","الأدلة بتوضح إن…"],["In the long term…","على المدى الطويل…"]],
  rd:["Localisation means shifting power and funding to local organisations. Many people believe local groups understand their communities better and can respond faster.",
      "Climate change affects Egypt in many ways: rising temperatures, water shortages and pressure on agriculture. Development projects now include climate adaptation.",
      "Youth unemployment is a big challenge in the region. Training alone is not enough. Young people also need networks, experience and access to finance.",
      "Women's economic empowerment is more than giving loans. It also means changing social norms, sharing care work and supporting women in decision-making.",
      "Aid budgets are decreasing in many countries. Organisations need to diversify their funding, build partnerships with the private sector and show clear results.",
      "Digital tools are changing development work. Mobile phones help us collect data, send money and reach people in remote areas. But not everyone has access.",
      "In my view, the biggest challenge for local NGOs is sustainable funding. On the other hand, they have strong community trust. In the long term, they need better systems and long partnerships, not short projects."],
  sq:["What is the biggest development challenge in your governorate?","Give your opinion on localisation in two minutes.","Agree and disagree with: 'Training alone solves unemployment.'","How does climate change affect the people you work with?","Compare your English today with day one. What changed?"],
  gx:["In my view, local NGOs should get more direct funding.","I partly agree, but I think the problem is bigger."]}
];

/* مصدر الاستماع لكل يوم في المحطة */
const LISTEN = [
  {t:"BBC 6 Minute English", lv:"مناسب لكل المستويات", u: w => YT("BBC 6 Minute English"), tip:"حلقات ٦ دقايق بإنجليزي واضح وبطيء، ومعاها نص مكتوب."},
  {t:"درس عن موضوع المحطة", lv:"مناسب لكل المستويات", u: w => YT(DAILY[w].topic), tip:"اختار فيديو مدته أقل من ١٠ دقايق."},
  {t:"UN Podcasts", lv:"مبتدئ ومتوسط", u: w => "https://news.un.org/un-podcasts", tip:"اختار حلقة قصيرة عن موضوع يهمك في التنمية."},
  {t:"TED Talk", lv:"متوسط", u: w => YT("TED talk " + ["community development","social change","teamwork","data for good","storytelling","fundraising","leadership","localization aid"][w]), tip:"شغّل الترجمة الإنجليزية (CC)، واسمع أول ٥ دقايق بس لو صعب."},
  {t:"The Development Podcast · World Bank", lv:"متوسط ومتقدم", u: w => "https://www.worldbank.org/podcast", tip:"اسمع أول ١٠ دقايق من أي حلقة."},
  {t:"Rethinking Humanitarianism", lv:"متقدم", u: w => "https://next.thenewhumanitarian.org/podcast/rethinking-humanitarianism", tip:"لو مستواك مبتدئ، ارجع لحلقة BBC اللي سمعتها أول يوم واسمعها تاني."},
  {t:"يوم إعادة", lv:"مناسب لكل المستويات", u: w => YT("BBC 6 Minute English"), tip:"اسمع تاني أكتر حلقة عجبتك الأسبوع ده. المرة التانية بتفهم أكتر بكتير."}
];

/* تمرين القاعدة لكل يوم */
const GRAM = [
  "اتفرج على فيديو القاعدة، واسمع المثالين وكررهم.",
  "اكتب ٣ جمل عن نفسك أو شغلك بالقاعدة دي.",
  "اقرا نص القراءة النهارده، وطلّع منه أي جملة فيها القاعدة.",
  "قول ٣ جمل بصوت عالي بالقاعدة عن مشروعك أو منظمتك.",
  "اكتب ٤ جمل بالقاعدة وابعتها لـClaude يصححها بالطلب الجاهز تحت.",
  "راجع سجل غلطاتك، وصحح أي جملة غلطت فيها في القاعدة دي.",
  "اختبر نفسك: ابعت الطلب الجاهز لـClaude وجاوب على ٥ أسئلة."
];


/* ===== شرح القاعدة بالعربي لكل محطة ===== */
const GRAM_AR = [
 "Present simple بنستخدمه للحاجات اللي بتحصل على طول أو عادةً: I work in Cairo يعني «أنا شغال في القاهرة». ومع he / she / it بنزود s: She works.\nPresent continuous للحاجة اللي بتحصل دلوقتي أو الفترة دي: am / is / are + الفعل بـ ing: I'm preparing a report يعني «بجهز تقرير دلوقتي».",
 "عشان تقول الهدف (عشان / علشان): in order to + فعل: We train teachers in order to improve education. أو so that + جملة كاملة.\nوعشان تقول السبب (بسبب): due to أو because of + اسم: due to poverty. أو because + جملة: because they are poor.",
 "الأفعال دي بتخلي كلامك مؤدب ومحترف:\nshould = المفروض (نصيحة) · could = ممكن (طلب مؤدب) · might = يمكن (احتمال) · would = عرض مؤدب: Would you like to start?\nوبعدهم الفعل على طول من غير to: We should share، مش should to share.",
 "عشان تقارن: الصفة القصيرة + er + than: higher than، lower than. والصفة الطويلة: more … than: more effective than. وفيه حالات خاصة: good ← better، bad ← worse.\nولوصف التغيير: increased / decreased from 20% to 45% (من … لـ)، أو by 25% (بمقدار).",
 "المبني للمجهول بنستخدمه لما الحاجة اللي اتعملت أهم من مين عملها، وده بيتكرر كتير في التقارير:\nwas / were + التصريف التالت: The project was launched in 2024.\nhas / have been + التصريف التالت لحاجة حصلت ولسه أثرها مستمر: 500 women have been trained.",
 "الشرط الأول لحاجة ممكن تحصل فعلًا: If + مضارع، وبعدها will + فعل: If we get the grant, we will hire trainers.\nالشرط التاني لحاجة خيالية أو مش متوقعة: If + ماضي، وبعدها would + فعل: If we had more money, we would work in more villages.",
 "الماضي المستمر لحاجة كانت شغالة في وقت معين في الماضي: was / were + ing: I was working in Minya يعني «كنت شغال في المنيا».\nولما حاجة تقاطعها نستخدم الماضي البسيط: While we were preparing the training, the donor called. ده مثالي لحكي القصص في المقابلات.",
 "عشان تقول رأيك: In my view / I believe / From my experience.\nعشان توافق: I agree / That's a fair point. وعشان توافق جزئيًا: I partly agree, but…\nوعشان تعترض بأدب: I'm not sure I agree / I see it differently.\nوخد بالك: الصح I agree، مش I am agree."
];

/* ===== الاختبار القبلي والبعدي (نفس الأسئلة) ===== */
const TEST = [
 {q:"I ___ as a project coordinator.", o:["work","working","am work"], a:0, e:"مع I بنستخدم الفعل من غير s ومن غير ing للحاجة اللي على طول."},
 {q:"Currently, we ___ a new project in Assiut.", o:["implement","are implementing","implemented"], a:1, e:"Currently يعني دلوقتي، فبنستخدم are + ing."},
 {q:"\"Beneficiaries\" means:", o:["المانحين","المستفيدين","الشركاء"], a:1, e:"Beneficiaries = المستفيدين. المانحين = donors."},
 {q:"The polite way to disagree:", o:["You are wrong.","I see your point, but…","No, this is bad."], a:1, e:"I see your point, but… بتوصل اعتراضك من غير ما تجرح حد."},
 {q:"The number of trained women ___ from 40 to 75.", o:["increased","increase","increasing"], a:0, e:"increased from … to … لوصف التغيير في الماضي."},
 {q:"The project ___ in 2024.", o:["launched","was launched","is launch"], a:1, e:"المشروع اتطلق (مبني للمجهول): was launched."},
 {q:"If we receive the grant, we ___ two trainers.", o:["hire","will hire","would hired"], a:1, e:"الشرط الأول: If + مضارع، will + فعل."},
 {q:"\"Baseline\" means:", o:["خط الأساس","الميزانية","الموعد النهائي"], a:0, e:"Baseline = خط الأساس، يعني الوضع قبل المشروع."},
 {q:"Which sentence is correct?", o:["I am agree with you.","I agree with you.","I agreeing with you."], a:1, e:"agree فعل لوحده، فمش محتاج am."},
 {q:"At the end of an interview, a good question is:", o:["Why did you call me?","What does success look like in this role?","Can I leave now?"], a:1, e:"السؤال ده بيبيّن اهتمامك وتحضيرك."}
];

/* ===== اختبار كل محطة (٥ أسئلة) ===== */
const QUIZ = [
 [{q:"We ___ in five governorates.", o:["operates","operate","operating"], a:1, e:"مع we الفعل من غير s."},
  {q:"Right now, I ___ on a report.", o:["work","am working","works"], a:1, e:"Right now = دلوقتي ← am + ing."},
  {q:"\"I'm in charge of…\" means:", o:["أنا مسؤول عن…","أنا شغوف بـ…","أنا تابع لـ…"], a:0, e:"in charge of = مسؤول عن."},
  {q:"A good self-introduction:", o:["My name Ahmed, work NGO.","I'm Ahmed. I work as a project officer at a local NGO.","Ahmed is me, I NGO."], a:1, e:"جملة كاملة: الاسم + الدور + المكان."},
  {q:"Our organisation ___ young people find jobs.", o:["help","helps","helping"], a:1, e:"organisation = it ← helps بـ s."}],
 [{q:"We train teachers ___ improve education.", o:["in order to","because","so"], a:0, e:"in order to + فعل للهدف."},
  {q:"Many children left school ___ poverty.", o:["due to","in order to","so that"], a:0, e:"due to + اسم للسبب."},
  {q:"\"Target group\" means:", o:["الفئة المستهدفة","الهدف العام","المجموعة البؤرية"], a:0, e:"target group = الفئة المستهدفة."},
  {q:"Outputs are…", o:["what we produce","the money we receive","the donor's priorities"], a:0, e:"Outputs = اللي بننتجه، زي عدد المتدربين."},
  {q:"The project ___ by the European Union.", o:["funds","is funded","funding"], a:1, e:"المشروع بيتمول ← is funded."}],
 [{q:"___ you send me the attendance list?", o:["Could","Must","Shall"], a:0, e:"Could للطلب المؤدب."},
  {q:"To ask someone to repeat:", o:["Repeat!","Sorry, could you repeat that?","What?!"], a:1, e:"دايمًا Sorry + could للأدب."},
  {q:"\"Action points\" means:", o:["المطلوب تنفيذه","نقاط النقاش","جدول الأعمال"], a:0, e:"Action points = مين هيعمل إيه وإمتى."},
  {q:"We ___ share the report before Thursday. (نصيحة)", o:["should","would","did"], a:0, e:"should = المفروض."},
  {q:"To delay a topic politely:", o:["Let's park that for now.","Let's kill that.","Stop talking."], a:0, e:"park that = نأجلها شوية."}],
 [{q:"The target was 500, and we ___ 620.", o:["reached","reach","reaching"], a:0, e:"ماضي ← reached."},
  {q:"Results this year were ___ than last year.", o:["good","better","best"], a:1, e:"good ← better في المقارنة."},
  {q:"\"Indicator\" means:", o:["مؤشر","مستفيد","نشاط"], a:0, e:"indicator = مؤشر."},
  {q:"Evaluation usually happens…", o:["every day","at specific times, like mid-term or end","never"], a:1, e:"التقييم في أوقات محددة، والمتابعة بشكل مستمر."},
  {q:"Qualitative data is…", o:["numbers only","stories and opinions","the budget"], a:1, e:"النوعي = قصص وآراء. الكمي = أرقام."}],
 [{q:"More than 500 women ___ trained.", o:["have been","has been","are been"], a:0, e:"women جمع ← have been."},
  {q:"A word that helps the audience follow you:", o:["Finally","Although","Unless"], a:0, e:"first, next, finally بيرتبوا العرض."},
  {q:"\"The key takeaway\" means:", o:["أهم رسالة","أول نقطة","آخر سؤال"], a:0, e:"key takeaway = أهم حاجة يطلع بيها الجمهور."},
  {q:"If you don't know the answer:", o:["I don't know. Next.","That's a good question. I'll check and get back to you.","Bad question."], a:1, e:"رد محترف وصادق."},
  {q:"The training centre ___ in 2023.", o:["opened","was opened","is opening"], a:1, e:"اتفتح (مبني للمجهول) ← was opened."}],
 [{q:"If we get the grant, we ___ two trainers.", o:["will hire","would hire","hired"], a:0, e:"الشرط الأول ← will."},
  {q:"If we had more time, we ___ more villages.", o:["will visit","would visit","visit"], a:1, e:"الشرط التاني ← would."},
  {q:"\"Eligibility criteria\" means:", o:["شروط الأهلية","معايير التقييم","الموعد النهائي"], a:0, e:"eligibility = الأهلية."},
  {q:"A concept note is…", o:["a short version of the proposal","the final report","a contract"], a:0, e:"Concept note = مذكرة مفاهيمية مختصرة."},
  {q:"A diplomatic way to refuse:", o:["No way.","I'm afraid that won't be possible, but what we can do is…","Forget it."], a:1, e:"ارفض واقترح بديل."}],
 [{q:"I ___ in Minya when the project started.", o:["was working","am working","work"], a:0, e:"كنت شغال ← was working."},
  {q:"STAR = Situation, Task, Action, ___", o:["Result","Risk","Report"], a:0, e:"Result = النتيجة."},
  {q:"Instead of \"umm\", it's better to…", o:["speak faster","pause silently for a second","repeat the question"], a:1, e:"السكوت ثانية بيبان ثقة."},
  {q:"\"One of my strengths is…\" means:", o:["من نقاط قوتي…","من عيوبي…","من أهدافي…"], a:0, e:"strength = نقطة قوة."},
  {q:"While we ___ the training, the donor called.", o:["were preparing","prepared","prepare"], a:0, e:"الحاجة اللي كانت شغالة ← were + ing."}],
 [{q:"To give your opinion:", o:["In my view…","In my eat…","In my place…"], a:0, e:"In my view = من وجهة نظري."},
  {q:"\"Localisation\" means:", o:["التوطين","العولمة","التوظيف"], a:0, e:"Localisation = التوطين."},
  {q:"To partly agree:", o:["I partly agree, but…","I totally refuse.","You are 100% wrong."], a:0, e:"partly = جزئيًا."},
  {q:"\"On the other hand\" is used to…", o:["add a contrasting idea","end the meeting","say thank you"], a:0, e:"لفكرة عكسية: ومن ناحية تانية."},
  {q:"\"In the long term\" means:", o:["على المدى الطويل","في الحال","في الماضي"], a:0, e:"long term = المدى الطويل."}]
];

/* ===== رسايل تحفيزية ===== */
const MOTIVE_SPECIAL = {
 1:"أهلًا بيك في أول يوم! طبيعي جدًا تحس إن الكلام سريع ومش فاهمه كله. ده مش ضعف، دي أول خطوة. هدفك النهارده إنك تكمّل، مش إنك تبقى مثالي.",
 2:"تاني يوم! لو امبارح حسيت إن الاستماع صعب، ده طبيعي جدًا. ودنك لسه بتتعود. اسمع مرة واتنين وتلاتة، وكل مرة هتفهم أكتر من اللي قبلها.",
 28:"نص الرحلة! إنك توصل لحد هنا ده لوحده إنجاز، لأن أغلب الناس بيبطّلوا قبل كده. انت مش منهم.",
 50:"قربت جدًا. افتح تسجيل أول يوم واسمعه، وهتعرف انت مشيت قد إيه.",
 56:"آخر يوم! برافو عليك. اعمل الاختبار النهائي واستلم شهادتك. انت تستاهلها."
};
const MOTIVE_STATION = "خلصت محطة كاملة! خد دقيقة وافتكر أول يوم فيها. أكيد فيه حاجة بقت أسهل عليك. اعمل اختبار المحطة في مهمة المراجعة.";
const MOTIVE = [
 "مش فاهم كل كلمة؟ طبيعي. ودنك محتاجة وقت تتعود على السرعة والنغمة. اسمع مرة واتنين وتلاتة، وكل مرة هتفهم أكتر.",
 "كل اللي بيتكلموا إنجليزي كويس دلوقتي، كانوا في يوم من الأيام في مكانك بالظبط.",
 "الغلط مش عيب. كل غلطة بتكتبها في المراجعة هي حاجة مش هتغلط فيها تاني.",
 "١٥ دقيقة كل يوم أحسن من ٣ ساعات مرة في الأسبوع. الاستمرار أهم من الكمية.",
 "ما تقارنش نفسك بحد. قارن نفسك بنفسك من أسبوع فات.",
 "النطق بيتحسن بالتكرار مش بالقراية. قول الجملة بصوت عالي، حتى لو حاسس إنك بتقولها غلط.",
 "لو اليوم صعب عليك، اعمل مهمتين بس. يوم صغير أحسن من يوم مقطوع.",
 "مش لازم تفهم الحلقة كلها. لو فهمت الفكرة العامة، تبقى كسبت.",
 "اللكنة مش مشكلة. المهم الناس تفهمك. متحدثين كتير في المؤتمرات الدولية بلكنات مختلفة.",
 "لما تحس إنك وقفت ومش بتتحسن، ده غالبًا قبل ما تحس بقفزة كبيرة. كمّل.",
 "اسمع نفس المقطع ٣ مرات: الأولى تتعود، التانية تفهم، التالتة تتكلم معاه.",
 "كل عبارة بتحفظها النهارده هتلاقيها جاهزة على لسانك في أول اجتماع.",
 "اسمع عبارات النهارده تاني قبل ما تنام. التكرار قبل النوم بيثبّت المعلومة.",
 "ما تترجمش في دماغك كلمة كلمة. فكّر في المعنى، والكلمات هتيجي.",
 "اتكلم ببطء. البطء الواضح أحسن من السرعة اللي فيها تهتهة.",
 "لو بتتكسف تسجل صوتك، ده طبيعي. محدش هيسمعه غيرك، وهتنبهر بالفرق بعد كام أسبوع.",
 "فوّت يوم؟ مفيش مشكلة. ابدأ من النهارده، ومن غير ما تحاول تعوّض كل اللي فات.",
 "كل مرة تقول جملة بالإنجليزي في الشغل، حتى لو صغيرة، دي خطوة.",
 "المحادثة مع Claude مساحة آمنة: اغلط زي ما تحب، محدش بيحكم عليك.",
 "اختار عبارة واحدة من النهارده واستخدمها في إيميل أو رسالة شغل حقيقية.",
 "التعلم مش خط مستقيم. فيه أيام هتحس إنك أحسن وأيام أصعب، والاتنين جزء من الرحلة.",
 "لو مش فاهم كلمة في النص، خمّن معناها من الجملة الأول، وبعدين اتأكد بالترجمة.",
 "انت مش بتتعلم إنجليزي وخلاص، انت بتتعلم إنجليزي شغلك. وده بيخليك تستفيد على طول.",
 "خد نفس قبل ما تتكلم. الثقة بتيجي من التحضير، مش من الكمال."
];
function motiveFor(v){ if (MOTIVE_SPECIAL[v]) return MOTIVE_SPECIAL[v]; if (v % 7 === 0) return MOTIVE_STATION; return MOTIVE[(v * 7) % MOTIVE.length]; }

/* ===== قاموس التنمية ===== */
const GLOSS_RAW = `accountability|المساءلة
action plan|خطة عمل
activity|نشاط
advocacy|المناصرة
agenda|جدول الأعمال
aid|مساعدات
allocation|تخصيص
annex|ملحق
annual report|تقرير سنوي
applicant|مقدم الطلب
assessment|تقييم / تقدير
assumption|افتراض
attendance sheet|كشف الحضور
audit|مراجعة / تدقيق
awareness session|جلسة توعية
baseline|خط الأساس
beneficiary|مستفيد
best practice|أفضل ممارسة
board of directors|مجلس الإدارة
budget|ميزانية
budget line|بند الميزانية
budget revision|تعديل الميزانية
burn rate|معدل الصرف
call for proposals|دعوة لتقديم مقترحات
capacity building|بناء القدرات
case study|دراسة حالة
cash transfer|تحويل نقدي
child protection|حماية الطفل
civil society|المجتمع المدني
climate adaptation|التكيف مع المناخ
co-financing|تمويل مشترك
code of conduct|مدونة السلوك
community|مجتمع محلي
community-based organisation|منظمة مجتمعية قاعدية
complaint mechanism|آلية الشكاوى
compliance|الامتثال
concept note|مذكرة مفاهيمية
consortium|تحالف / ائتلاف
consultant|استشاري
contract|عقد
coordination|تنسيق
cost-effective|فعّال من حيث التكلفة
cross-cutting issues|قضايا مشتركة
data collection|جمع البيانات
deadline|الموعد النهائي
deliverable|مُخرَج مطلوب تسليمه
direct costs|التكاليف المباشرة
disability inclusion|دمج ذوي الإعاقة
disbursement|صرف دفعة
do no harm|عدم الإضرار
donor|مانح / جهة مانحة
duplication|ازدواجية / تكرار
early recovery|التعافي المبكر
economic empowerment|التمكين الاقتصادي
effectiveness|الفعالية
efficiency|الكفاءة
eligibility|الأهلية
eligible costs|التكاليف المؤهلة
emergency response|الاستجابة للطوارئ
empowerment|تمكين
endline survey|المسح النهائي
evaluation|تقييم
evidence|أدلة / شواهد
exit strategy|استراتيجية الخروج
expenditure|مصروفات
facilitator|ميسّر
feasibility study|دراسة جدوى
feedback|تغذية راجعة / ملاحظات
field visit|زيارة ميدانية
financial report|تقرير مالي
focal point|نقطة اتصال
focus group discussion|مجموعة نقاش مركزة
food security|الأمن الغذائي
fundraising|جمع التبرعات
gender equality|المساواة بين الجنسين
gender mainstreaming|تعميم منظور النوع الاجتماعي
goal|هدف عام
governance|الحوكمة
governorate|محافظة
grant|منحة
grant agreement|اتفاقية المنحة
grassroots|قاعدي / على مستوى القاعدة
guidelines|إرشادات
human rights|حقوق الإنسان
humanitarian|إنساني
impact|أثر
implementation|تنفيذ
implementing partner|شريك منفذ
inception phase|المرحلة التمهيدية
inclusion|دمج / شمول
income generation|توليد الدخل
indicator|مؤشر
indirect costs|التكاليف غير المباشرة
in-kind contribution|مساهمة عينية
inputs|مدخلات
internal control|الرقابة الداخلية
intervention|تدخل
key informant interview|مقابلة مع مصادر رئيسية
lessons learned|الدروس المستفادة
livelihoods|سبل العيش
local NGO|جمعية / منظمة محلية
localisation|التوطين
logframe|الإطار المنطقي
long-term|طويل المدى
mandate|ولاية / تفويض
match funding|تمويل مقابل
memorandum of understanding|مذكرة تفاهم
mentoring|إرشاد / توجيه
methodology|منهجية
microfinance|التمويل متناهي الصغر
mid-term review|مراجعة منتصف المدة
milestone|مرحلة رئيسية
mission|رسالة المنظمة
monitoring|متابعة / رصد
needs assessment|تقييم الاحتياجات
networking|بناء العلاقات
no-cost extension|تمديد بدون تكلفة
non-profit|غير هادف للربح
objective|هدف محدد
outcome|نتيجة / حصيلة
outputs|مخرجات
outreach|الوصول / التواصل المجتمعي
overhead|المصروفات الإدارية العامة
participatory approach|نهج تشاركي
partnership|شراكة
pilot|مشروع تجريبي
policy brief|ورقة سياسات
post-distribution monitoring|متابعة ما بعد التوزيع
poverty reduction|الحد من الفقر
priority|أولوية
procurement|المشتريات
programme|برنامج
progress report|تقرير مرحلي
project cycle|دورة المشروع
proposal|مقترح مشروع
psychosocial support|الدعم النفسي الاجتماعي
qualitative|نوعي
quantitative|كمي
quarterly report|تقرير ربع سنوي
reallocation|إعادة توزيع
recommendation|توصية
referral|إحالة
refugee|لاجئ
relevance|الملاءمة
resilience|الصمود / القدرة على التكيف
results framework|إطار النتائج
risk mitigation|تخفيف المخاطر
rural|ريفي
safeguarding|الحماية من الإساءة
sample|عينة
scale up|التوسع
social cohesion|التماسك الاجتماعي
social enterprise|مشروع اجتماعي
stakeholder|صاحب مصلحة
steering committee|لجنة توجيهية
sub-grant|منحة فرعية
supporting documents|المستندات المؤيدة
survey|استبيان / مسح
sustainability|الاستدامة
target|المستهدف
target group|الفئة المستهدفة
technical support|دعم فني
terms of reference (ToR)|الشروط المرجعية
theory of change|نظرية التغيير
timeline|الجدول الزمني
track record|سجل الإنجازات
training of trainers (ToT)|تدريب المدربين
transparency|الشفافية
unemployment|البطالة
value for money|القيمة مقابل المال
variance|انحراف / فرق
vocational training|تدريب مهني
volunteer|متطوع
vulnerable groups|الفئات الأولى بالرعاية
water and sanitation (WASH)|المياه والصرف الصحي
women-led|تقوده نساء
work plan|خطة العمل
workshop|ورشة عمل
youth employment|تشغيل الشباب`;
const GLOSS = GLOSS_RAW.split("\n").map(l => l.split("|")).filter(x => x.length === 2);
