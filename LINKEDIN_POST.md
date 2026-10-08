I tried a small LARP in my AI in Media and Communication class, and it was a big success.

The premise was simple: a studio wants to cast an AI actress in a role that a human could play. Students split into three groups: the studio, the actors' union, and the company that made the AI actress.

They had to negotiate five actual terms: how large the role could be, whose consent was needed, who got paid, what appeared in the credits, and whether the film had to tell the audience that the actress was AI. The studio group also got to invent the movie genre and decide which role she would play.

Halfway through, I gave them a news flash: test audiences loved the AI actress, and the studio now wanted her as the lead in the sequel. Suddenly the first deal did not look so stable.

What I liked most was that students could not stop at "AI is good" or "AI is bad." They had to bargain. If they wanted consent, what would they trade for it? If the studio wanted a bigger role, who would get paid? Where would disclosure appear?

I built two small web apps for the activity. One gives each group its role card and deal sheet. The other turns the final agreement into one of five video game endings. I vibe-coded the tools with Claude Opus 5.5 and GPT-5.6 Sol, then tested and revised them around the way the activity actually ran in class.

I have open-sourced the whole thing, including the role cards, classroom plan, Supabase setup, and optional model-powered ending generator. The public version uses an unnamed AI actress, and the ending generator can use OpenAI or Anthropic. Anyone who forks it supplies their own model API key, database, and teacher codes.

https://github.com/uless/ai-actor-negotiation-larp

#MediaEducation #AIInEducation #LARP #TeachingWithAI
