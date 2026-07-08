package com.orbitsync.inspireapp

data class Quote(
    val text: String,
    val author: String,
    val category: QuoteCategory
)

enum class QuoteCategory(val label: String, val emoji: String) {
    MOTIVATION("Motivation", "⚠️"),
    SUCCESS("Success", "호️"),
    TECH("Tech", "�️"),
    CRITICAL_THINKING("Critical Thinking", "𝓫️")
}

object QuoteData {
    val allQuotes: List<Quote> = listOf(
        // Motivation
        Quote("The only way to do great work is to love what you do.", "Steve Jobs", QuoteCategory.MOTIVATION),
        Quote("Believe you can and you're halfway there.", "Theodore Roosevelt", QuoteCategory.MOTIVATION),
        Quote("It does not matter how slowly you go as long as you do not stop.", "Confucius", QuoteCategory.MOTIVATION),
        Quote("Your time is limited, don't waste it living someone else's life.", "Steve Jobs", QuoteCategory.MOTIVATION),
        Quote("Everything you've ever wanted is on the other side of fear.", "George Addair", QuoteCategory.MOTIVATION),
        Quote("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt", QuoteCategory.MOTIVATION),
        Quote("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill", QuoteCategory.MOTIVATION),

        // Success
        Quote("Success is not the key to happiness. Happiness is the key to success.", "Albert Schweitzer", QuoteCategory.SUCCESS),
        Quote("Don't be afraid to give up the good to go for the great.", "John D. Rockefeller", QuoteCategory.SUCCESS),
        Quote("The secret of success is to do the common things uncommonly well.", "John D. Rockefeller Jr.", QuoteCategory.SUCCESS),
        Quote("Success usually comes to those who are too busy to be looking for it.", "Henry David Thoreau", QuoteCategory.SUCCESS),
        Quote("Opportunities don't happen. You create them.", "Chris Grosser", QuoteCategory.SUCCESS),
        Quote("The only place where success comes before work is in the dictionary.", "Vidal Sassoon", QuoteCategory.SUCCESS),

        // Tech
        Quote("The technology you use impresses no one. The experience you create with it is everything.", "Sean Geraty", QuoteCategory.TECH),
        Quote("It's not that we use technology, we live technology.", "Godfrey Reggio", QuoteCategory.TECH),
        Quote("Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke", QuoteCategory.TECH),
        Quote("First we shape our tools, then our tools shape us.", "Marshall McLuhan", QuoteCategory.TECH),
        Quote("Code is like humor. When you have to explain it, it's bad.", "Cory House", QuoteCategory.TECH),
        Quote("The computer was born to solve problems that did not exist before.", "Bill Gates", QuoteCategory.TECH),

        // Critical Thinking
        Quote("The unexamined life is not worth living.", "Socrates", QuoteCategory.CRITICAL_THINKING),
        Quote("It is the mark of an educated mind to be able to entertain a thought without accepting it.", "Aristotle", QuoteCategory.CRITICAL_THINKING),
        Quote("We cannot solve our problems with the same thinking we used when we created them.", "Albert Einstein", QuoteCategory.CRITICAL_THINKING),
        Quote("Question everything. Learn something. Answer nothing.", "Euripides", QuoteCategory.CRITICAL_THINKING),
        Quote("Thinking is the hardest work there is, which is probably the reason so few engage in it.", "Henry Ford", QuoteCategory.CRITICAL_THINKING),
        Quote("Wise men speak because they have something to say; fools because they have to say something.", "Plato", QuoteCategory.CRITICAL_THINKING)
    )

    fun getQuotesByCategory(category: QuoteCategory): List<Quote> {
        return allQuotes.filter { it.category == category }
    }
}
