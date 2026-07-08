import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import org.jetbrains.compose.ui.renderComposable

// ---------- DATA LAYER ----------

data class Quote(val text: String, val author: String, val category: QuoteCategory)

enum class QuoteCategory(val label: String, val emoji: String) {
    MOTIVATION("Motivation", "\uD83D\uDE80"),
    SUCCESS("Success", "\uD83C\uDFC6"),
    TECH("Tech", "\uD83D\uDCBB"),
    CRITICAL_THINKING("Critical Thinking", "\uD83E\uDDE0")
}

val allQuotes = listOf(
    Quote("The only way to do great work is to love what you do.", "Steve Jobs", QuoteCategory.MOTIVATION),
    Quote("Believe you can and you\u0027re halfway there.", "Theodore Roosevelt", QuoteCategory.MOTIVATION),
    Quote("It does not matter how slowly you go as long as you do not stop.", "Confucius", QuoteCategory.MOTIVATION),
    Quote("Your time is limited, don\u0027t waste it living someone else\u0027s life.", "Steve Jobs", QuoteCategory.MOTIVATION),
    Quote("Everything you\u0027ve ever wanted is on the other side of fear.", "George Addair", QuoteCategory.MOTIVATION),
    Quote("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt", QuoteCategory.MOTIVATION),
    Quote("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill", QuoteCategory.MOTIVATION),
    Quote("Success is not the key to happiness. Happiness is the key to success.", "Albert Schweitzer", QuoteCategory.SUCCESS),
    Quote("Don\u0027t be afraid to give up the good to go for the great.", "John D. Rockefeller", QuoteCategory.SUCCESS),
    Quote("The secret of success is to do the common things uncommonly well.", "John D. Rockefeller Jr.", QuoteCategory.SUCCESS),
    Quote("Success usually comes to those who are too busy to be looking for it.", "Henry David Thoreau", QuoteCategory.SUCCESS),
    Quote("Opportunities don\u0027t happen. You create them.", "Chris Grosser", QuoteCategory.SUCCESS),
    Quote("The only place where success comes before work is in the dictionary.", "Vidal Sassoon", QuoteCategory.SUCCESS),
    Quote("The technology you use impresses no one. The experience you create with it is everything.", "Sean Geraty", QuoteCategory.TECH),
    Quote("It\u0027s not that we use technology, we live technology.", "Godfrey Reggio", QuoteCategory.TECH),
    Quote("Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke", QuoteCategory.TECH),
    Quote("First we shape our tools, then our tools shape us.", "Marshall McLuhan", QuoteCategory.TECH),
    Quote("Code is like humor. When you have to explain it, it\u0027s bad.", "Cory House", QuoteCategory.TECH),
    Quote("The computer was born to solve problems that did not exist before.", "Bill Gates", QuoteCategory.TECH),
    Quote("The unexamined life is not worth living.", "Socrates", QuoteCategory.CRITICAL_THINKING),
    Quote("It is the mark of an educated mind to be able to entertain a thought without accepting it.", "Aristotle", QuoteCategory.CRITICAL_THINKING),
    Quote("We cannot solve our problems with the same thinking we used when we created them.", "Albert Einstein", QuoteCategory.CRITICAL_THINKING),
    Quote("Question everything. Learn something. Answer nothing.", "Euripides", QuoteCategory.CRITICAL_THINKING),
    Quote("Thinking is the hardest work there is, which is probably the reason so few engage in it.", "Henry Ford", QuoteCategory.CRITICAL_THINKING),
    Quote("Wise men speak because they have something to say; fools because they have to say something.", "Plato", QuoteCategory.CRITICAL_THINKING)
)

fun quotesByCategory(category: QuoteCategory) = allQuotes.filter { it.category == category }

// ---------- GRADIENT PALETTE ----------

val categoryGradients = mapOf(
    QuoteCategory.MOTIVATION to listOf(Color(0xFF667EEA), Color(0xFF764BA2)),
    QuoteCategory.SUCCESS to listOf(Color(0xFFF093FB), Color(0xFFF5576C)),
    QuoteCategory.TECH to listOf(Color(0xFF4FACFE), Color(0xFF00F2FE)),
    QuoteCategory.CRITICAL_THINKING to listOf(Color(0xFF43E97B), Color(0xFF38F9D7))
)

// ---------- UI ----------

@Composable
fun InspireApp() {
    val categories = QuoteCategory.entries
    var selectedCategory by remember { mutableStateOf(QuoteCategory.MOTIVATION) }
    val quotes = remember(selectedCategory) { quotesByCategory(selectedCategory) }
    var currentIndex by remember(selectedCategory) { mutableStateOf(0) }
    var favorites by remember { mutableStateOf(setOf<String>()) }
    var copiedVisible by remember { mutableStateOf(false) }
    val currentQuote = quotes[currentIndex]
    val isFavorite = currentQuote.text in favorites

    val gradientColors = categoryGradients[selectedCategory] ?: listOf(Color(0xFF6C63FF), Color(0xFF764BA2))
    val animatedGradientEnd by animateColorAsState(
        targetValue = gradientColors[1],
        animationSpec = tween(600),
        label = "bgGradient"
    )

    LaunchedEffect(copiedVisible) {
        if (copiedVisible) {
            delay(2000)
            copiedVisible = false
        }
    }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF6C63FF),
            surface = Color(0xFFFDFDFF),
            onSurface = Color(0xFF2D2D3A)
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            gradientColors[0].copy(alpha = 0.12f),
                            animatedGradientEnd.copy(alpha = 0.06f)
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier.fillMaxSize().padding(top = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Inspire",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                    color = gradientColors[0],
                    modifier = Modifier.padding(bottom = 10.dp)
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    contentPadding = PaddingValues(horizontal = 12.dp)
                ) {
                    items(categories) { category ->
                        val isSelected = category == selectedCategory
                        val tabColor by animateColorAsState(
                            targetValue = if (isSelected) gradientColors[0] else Color(0xFFE0E0E8),
                            animationSpec = tween(400),
                            label = "tabColor"
                        )
                        val tabBg by animateColorAsState(
                            targetValue = if (isSelected) gradientColors[0].copy(alpha = 0.12f) else Color.Transparent,
                            animationSpec = tween(400),
                            label = "tabBg"
                        )

                        Column(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(tabBg)
                                .clickable { selectedCategory = category; currentIndex = 0 }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(text = category.emoji, fontSize = 18.sp)
                            Text(
                                text = category.label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = tabColor
                            )
                        }
                        if (category != categories.last()) Spacer(Modifier.width(6.dp))
                    }
                }

                Spacer(Modifier.height(22.dp))

                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(
                        modifier = Modifier.padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "\u275D\u275E", fontSize = 42.sp, color = gradientColors[0])
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = currentQuote.text,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            color = Color(0xFF2D2D3A),
                            lineHeight = 30.sp
                        )
                        Spacer(Modifier.height(18.dp))
                        Box(
                            modifier = Modifier
                                .height(2.dp)
                                .fillMaxWidth(0.4f)
                                .clip(CircleShape)
                                .background(gradientColors[0].copy(alpha = 0.3f))
                        )
                        Spacer(Modifier.height(14.dp))
                        Text(
                            text = "\u2014 ${currentQuote.author}",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Light,
                            color = Color(0xFF8888A0)
                        )
                        Spacer(Modifier.height(20.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = {
                                favorites = if (isFavorite) favorites - currentQuote.text
                                else favorites + currentQuote.text
                            }) {
                                Text(
                                    text = if (isFavorite) "\u2764\uFE0F" else "\uD83E\uDE77",
                                    fontSize = 24.sp
                                )
                            }

                            Spacer(Modifier.width(16.dp))

                            IconButton(onClick = {
                                copiedVisible = true
                            }) {
                                Text(
                                    text = "\uD83D\uDCCB",
                                    fontSize = 20.sp
                                )
                            }
                        }

                        if (copiedVisible) {
                            Text(
                                text = "\u2705 Copied to clipboard!",
                                fontSize = 13.sp,
                                color = gradientColors[0],
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = "${quotes.size} quotes in this category",
                            fontSize = 12.sp,
                            color = Color(0xFFC0C0D0)
                        )
                    }
                }

                Spacer(Modifier.weight(1f))

                Button(
                    onClick = { currentIndex = (currentIndex + 1) % quotes.size },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = gradientColors[0])
                ) {
                    Text(
                        text = "Next Quote",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

fun main() {
    renderComposable(rootElementId = "root") {
        InspireApp()
    }
}
