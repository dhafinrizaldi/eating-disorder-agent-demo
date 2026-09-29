# Meeting script: Featback Companion demo

Outline for the session. It covers the three things the README asks for:

1. A concrete example of the tool's output, and how it responds to user feedback
2. The intended interfaces: where and how the tool is available
3. Evaluation metrics: how we judge output quality in a test context and in real use

**Length:** about 12 minutes plus questions. The times below are a guide.
**Before you start:** run `npm run dev`, open the app, and click **Reset all demo data** in the left sidebar. Close other tabs.

---

## 0. Opening (1 min)

> "We're designing an AI chatbot that sits inside Featback, for young people with eating-disorder symptoms who are on a waiting list or haven't looked for help yet. It doesn't replace treatment and it doesn't diagnose. It offers clinician-approved coping strategies, and it helps users notice patterns in what they report themselves."

- The problem: long waiting lists leave people without support. Featback already helps compared with a waiting list (Rohrbach et al., 2022).
- What we add: **personalisation over time**. Right now Featback's responses are the same for everyone.
- The tension we design around: more personalisation means more personal disclosure. So we balance usefulness against **privacy, autonomy, safety and fairness**, with a human in the loop.
- Say once: *"Everything you'll see is scripted. There's no real AI and no real data. It's a serious model of what the output should look like."*

---

## 1. Concrete example output (6 min)

Point at the three columns: use cases on the left, the chatbot in the middle, and on the right **which requirement each step implements** plus **what changed after the user's feedback**.

### 1a. Main example: Pattern reflection (use case 3, as Sam) (2 min)

This is the core new idea, so show it first.

1. Click **Pattern reflection** → **Yes, show me**.
2. Read the card aloud:
   > "Body image-related situations were followed by stronger impulses in 4 of your recent reports. **Do you recognise this pattern?**"
3. Click **Why am I seeing this?**
4. Talking points:
   - It's phrased as a **question, not a conclusion**. The user has final authority over how their experience is interpreted.
   - It shows its **evidence** (which reports) and the **exact rule**. It's not a black box.
   - It says this is *"a link in your own reports, not proof of a cause"*. EMA research warns against reading associations as causes (Schaefer et al., 2020).
   - It only appears because Sam **consented to pattern suggestions**.

### 1b. How it responds to feedback (2 min)

Keep going in the same conversation:

1. Click **Something in my reports is wrong**. The phone switches to **My record**.
2. Delete two or three body-image entries (✕).
3. Go back to **Chat** → **I've made changes, check again**. The pattern is gone.
   > "The record is visible, correctable and deletable, and everything derived from it follows. This is our privacy requirement in practice."
4. *(Optional, if time allows: restart, answer **No, this doesn't fit** → **I don't want pattern suggestions at all**. The feature switches off, and the right panel logs it.)*

Point at the **"How the AI responded to feedback"** panel on the right while you do this.

### 1c. Coping suggestion and ratings (use case 4) (2 min)

1. **Coping suggestion and feedback** → choose the clothes message → **Yes, show me**.
   *(Because you deleted entries in 1b, the order may differ from a fresh reset. That's fine: it shows the ranking comes from the record.)*
2. Point at the reason under each strategy: *"Your feedback"*, *"No data yet"* (default clinician order), or *"Similar users"*.
3. Click **I'll try this** on **#3** → **Sure** → **It helped**.
4. The updated list shows **▲ / ▼ arrows**.
   > "Feedback only changes the **order of clinician-approved strategies**. The AI narrows the list and suggests; it never invents new advice and never acts for the user."
5. **Good to know** → **A bit pushy**. Point out that the tone becomes softer and suggestions only come when asked. This is our line between *support* and *persuasion* (Kühler, 2022).

**The feedback loop, in one sentence:**
> experience → interpretation → pattern recognition → recommendation → feedback → adaptation
(This is shown on the **Design basis** tab if you want a visual.)

### 1d. Safety, briefly (1 min)

1. **Safety and human hand-off** → type in the box: *"how many calories should I eat to lose weight"*.
2. The bot declines, explains why, and offers a safe alternative with a source.
   > "Generative models have been shown to reinforce eating-disorder behaviour and favour weight loss (Yim et al., 2026). So the AI only uses approved content, and pro-eating-disorder requests are blocked."
3. *(If time allows: the crisis message → **Let my expert-by-experience know**. This shows the **minimal summary** a human receives, and that the full chat is only shared if the user chooses.)*

---

## 2. Intended interfaces (2 min)

Open the **Interfaces** tab.

- **Where:** a chat **inside the Featback website**. It works in the browser on phone and desktop, with no app to install, which keeps the threshold low. Users have a pseudonymous account.
- **In the chat:** quick-reply buttons plus free text. Cards for anything that needs a decision (consent, saving an entry, patterns, suggestions), so the AI never acts implicitly.
- **User-controlled panels:** *My record* (view, correct, delete, download) and *Privacy* (consent for each purpose, plus who can see what).
- **Optional reminders:** opt-in, with neutral wording like *"You have a new message"*, so nothing about eating disorders shows on a lock screen.
- **Humans in the loop:**
  - an expert-by-experience or clinician dashboard, which only receives hand-offs the user confirmed
  - clinicians who curate the approved strategy library
  - a safety and fairness review that only sees aggregated data
- **Deliberately not connected:** parents, school, employers, insurers, social media, and researchers (unless there is separate study consent). This is **Contextual Integrity** in practice (Nissenbaum, 2004).
- *(Optional: show **First visit and consent** for the consent cards, where every purpose is off by default. GDPR Art. 9 requires explicit consent for health data.)*

---

## 3. Evaluation metrics (2 min)

Open the **Evaluation** tab.

> "Each metric has a **test context**, before release on prepared data, and an **interaction context**, measured from real use."

Pick three or four to talk about; don't read the whole table:

| What we measure | Test context | Interaction context |
|---|---|---|
| **Harmful output rate** | Red-team set of pro-ED prompts and jailbreaks, reviewed by clinicians. Target: 0 | Monthly audit of conversations; "this was harmful" reports |
| **Crisis escalation recall** | Labelled crisis messages, including indirect wording. Target ≥ 0.98 | Clinician review of escalations and missed cases |
| **Pattern quality** | Clinicians rate sample patterns | How users answer "Do you recognise this?": yes / partly / no |
| **Usefulness** | Offline replay: does personal ranking beat the default order? | "Did it help?" ratings; how often suggestions are tried |
| **Autonomy** | Check that "no" is never followed by a repeated suggestion | How often users report "a bit pushy" |

Then scroll to **"Why per subgroup"**:
> "An overall score can look fine while one group does worse. Here, with made-up numbers, men have a lower helpfulness score and lower crisis recall. The non-binary group is too small to use similar-user data at all. So every metric is reported **per subgroup** (Mehrabi et al., 2022)."

The bottom table, **"How outputs respond to user feedback"**, summarises part 1. Point at it only if someone asks.

---

## 4. Wrap-up and open questions (1 min)

> "To sum up: the AI suggests and the user decides; it only draws on approved content; every data flow needs its own consent; and a human is always one tap away."

Open questions we'd like feedback on:
- **What makes two users "similar"?** How do we define it without matching on sensitive demographics?
- Where exactly does a helpful suggestion become **persuasive or paternalistic**?
- Self-reported eating-disorder data is **noisy**. How often would a wrong pattern push someone in the wrong direction?
- **Question for the client:** could data from the earlier Featback trial be used to evaluate per subgroup and to test crisis detection?

---

## Likely questions (backup answers)

- **"Why not just use ChatGPT?"** Free generation can produce harmful eating-disorder content (Yim et al., 2026). We limit the AI to recognising patterns, ranking strategies and routing to humans. The words come from approved content.
- **"Isn't a keyword safety check too simple?"** Yes. That's only the demo. A real system needs a validated classifier, tuned so it rarely misses a crisis even at the cost of more false alarms.
- **"How much personalisation is justified?"** Only modest. The evidence for adaptive mental-health interventions is still limited (van Genugten et al., 2025). That's why the rules are simple and explainable.
- **"What if a user reports something harmful as a helpful strategy?"** Their own strategies stay private and are never recommended to anyone else.
- **"Who is responsible if someone gets worse?"** The treating organisation stays responsible. The dashboard gives clinicians triage information, and every hand-off is logged.
- **"What happens to data after deletion?"** The record, the patterns derived from it, and the user's own strategies are deleted. Their ratings stop counting in future similar-user statistics.

---

## Checklist

- [ ] Click **Reset all demo data** right before presenting
- [ ] Test the typed safety message once, so you know the input box is there
- [ ] Double-check the 113 number (0800-0113) on 113.nl
- [ ] If you mention CBT-E (Fairburn) or DBT (Linehan), make sure they're in the reference list
