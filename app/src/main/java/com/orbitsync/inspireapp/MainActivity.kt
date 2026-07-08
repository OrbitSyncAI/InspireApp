package com.orbitsync.inspireapp

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val categoryGradients = mapOf(
    QuoteCategory.MOTIVATION to listOf(Color(0xFF667EEA), Color(0xFF764BA2)),
    QuoteCategory.SUCCESS to listOf(Color(0xFFF093FB), Color(0xFFF5576C)),
    QuoteCategory.TECH to listOf(Color(0xFF4FACFE), Color(0xFF00F2FE)),
    QuoteCategory.CRITICAL_THINKING to listOf(Color(0xFF43E97B), Color(0xFF38F9D7))
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            InspireAppTheme {
                InspireApp()
            }
        }
    }
}

@Composable
fun InspireAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF6C63FF),
            surface = Color(0xFFFDFDFF),
            onSurface = Color(0xFF2D2D3A)
        ),
        content = content
    )
}

@Composable
fun InspireApp() {
    val context = LocalContext.current
    val categories = QuoteCategory.entries
    var selectedCategory by remember { mutableStateOf(QuoteCategory.MOTIVATION) }
    val quotes = remember(selectedCategory) { QuoteData.getQuotesByCategory(selectedCategory) }
    var currentIndex by remember(selectedCategory) { mutableStateOf(0) }
    var favorites by remember { mutableStateOf(setOf<String>()) }
    val currentQuote = quotes[currentIndex]
    val isFavorite = currentQuote.text in favorites

    val gradientColors = categoryGradients[selectedCategory] ?: listOf(Color(0xFF6C63FF), Color(0xFF764BA2))
    val animatedGradientEnd by animateColorAsState(
        targetValue = gradientColors[1],
        animationSpec = tween(durationMillis = 600),
        label = "bgGradient"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(gradientColors[0].copy(alpha = 0.12f), animatedGradientEnd.copy(alpha = 0.06f))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Inspire",
                fontSize = 30.sp,
                fontWeight = FontWeight.Bold,
                color = gradientColors[0],
                modifier = Modifier.padding(bottom = 8.dp)
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
                            .clickable { selectedCategory = category }
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
                    if (category != categories.last()) {
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "\u275D\u275E",
                        fontSize = 42.sp,
                        color = gradientColors[0]
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = currentQuote.text,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        color = Color(0xFF2D2D3A),
                        lineHeight = 30.sp
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Box(
                        modifier = Modifier
                            .height(2.dp)
                            .fillMaxWidth(0.4f)
                            .clip(CircleShape)
                            .background(gradientColors[0].copy(alpha = 0.3f))
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "\u2014 ${currentQuote.author}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Light,
                        color = Color(0xFF8888A0)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = {
                                favorites = if (isFavorite) {
                                    favorites - currentQuote.text
                                } else {
                                    favorites + currentQuote.text
                                }
                            }
                        ) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                contentDescription = "Favorite",
                                tint = if (isFavorite) Color(0xFFF5576C) else Color(0xFFB0B0C0),
                                modifier = Modifier.size(26.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        IconButton(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = ClipData.newPlainText("quote", "\"${currentQuote.text}\" \u2014 ${currentQuote.author}")
                                clipboard.setPrimaryClip(clip)
                                Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Filled.ContentCopy,
                                contentDescription = "Copy",
                                tint = Color(0xFFB0B0C0),
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "${quotes.size} quotes in this category",
                        fontSize = 12.sp,
                        color = Color(0xFFC0C0D0)
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    currentIndex = (currentIndex + 1) % quotes.size
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .height(54.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = gradientColors[0]
                )
            ) {
                Text(
                    text = "Next Quote",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
