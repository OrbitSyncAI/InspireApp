package com.orbitsync.inspireapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val quotes = listOf(
    Quote("The only way to do great work is to love what you do.", "Steve Jobs"),
    Quote("Believe you can and you're halfway there.", "Theodore Roosevelt"),
    Quote("It does not matter how slowly you go as long as you do not stop.", "Confucius")
)

data class Quote(val text: String, val author: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            InspireAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    QuoteScreen()
                }
            }
        }
    }
}

@Composable
fun InspireAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF6C63FF),
            surface = Color(0xFF5F5FF),
            onSurface = Color(0xFF2D2D3A)
        ),
        content = content
    )
}

@Composable
fun QuoteScreen() {
    var currentIndex by remember { mutableStateOf(0) }
    val currentQuote = quotes[currentIndex]

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFFE8E4FF), Color(0xFDFDFFF))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Inspire",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF6C63FF),
                modifier = Modifier.padding(bottom = 24.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "✝✞",
                        fontSize = 36.sp,
                        color = Color(0xFF6C63FF)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = currentQuote.text,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        color = Color(0xFF2D2D3A),
                        lineHeight = 30.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "— ${currentQuote.author}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Light,
                        color = Color(0xFF8888A0)
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = {
                    currentIndex = (currentIndex + 1) % quotes.size
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF))
            ) {
                Text(
                    text = "Next Quote",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
