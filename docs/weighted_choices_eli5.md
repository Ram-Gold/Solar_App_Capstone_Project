# Weighted Choices: Explain It Like I'm 5 (Solar Edition)

A simple, story-driven explanation of how the JD Solar product matcher makes smart decisions.

---

## The Great Backyard Treehouse Mystery

Imagine you and your friend want to put a **Solar Light** on your treehouse. 

Your solar light needs to do three things:
1. Soak up the sun during the daytime with its little solar panel.
2. Save that sun power in a battery.
3. Shine nice and bright at night so you can read comic books in your treehouse.

You open the hardware shop door, and the shopkeeper shows you **three different solar lights**:

| Option | Product | What It's Like | Price |
| :--- | :--- | :--- | :--- |
| **Light A** | **The Pocket Garden Light** | Very cheap, cute, but only glows like a firefly. | ₱300 |
| **Light B** | **The Monster Highway Crane Light** | Giant industrial luminaire meant for an 8-meter steel pole on a 6-lane road. Blindingly bright! | ₱8,000 |
| **Light C** | **The Treehouse Solar Luminaire** | Just the right size, lights up the whole deck, mounts easily on wood. | ₱1,500 |

---

## If We Did Not Use "Weights" (The Silly Way)

Imagine asking your computer: *"Hey computer, just pick the one with the biggest brightness number!"*

The computer says:
> *"Pick Light B! It has 600 Watts and is super bright!"*

That sounds silly, right?
- Light B costs ₱8,000! You only have ₱2,000 in your piggy bank!
- Light B is so heavy it might crack the wooden branch!
- Light B is so bright it would blind the neighbors and light up the entire street!

If we only look at **one single feature**, we make a bad choice.

---

## How "Weighted Choices" Solve This

Instead of looking at only one thing, we look at everything that matters to you. 

Your dad gives you **10 Golden Coins of Importance** to spend on what you care about:

1. **Piggy Bank Coins (Budget)**: You only have ₱2,000, so price is super important. You put **4 Coins** here.
2. **Treehouse Fit (Location)**: It must fit on a wooden post and not blind people. You put **3 Coins** here.
3. **Brightness (Power)**: It needs to be bright enough to see comics. You put **3 Coins** here.

Total Coins = 4 + 3 + 3 = **10 Coins**.

Those coins are called **WEIGHTS**. 
If something has more coins, it has a bigger voice in the final decision!

---

## Giving Each Solar Light a Report Card (1 to 10 points)

Now we give every solar light a grade from 1 to 10 for each category, and multiply by your coins.

### Testing Light A: The Pocket Garden Light (₱300)
- **Piggy Bank Grade**: 10 out of 10! (Super cheap!)
  - Points: $10 \times 4\text{ coins} = 40$
- **Treehouse Fit Grade**: 7 out of 10. (Fits nicely, but doesn't reach the dark corners.)
  - Points: $7 \times 3\text{ coins} = 21$
- **Brightness Grade**: 2 out of 10. (Way too dim to read comics.)
  - Points: $2 \times 3\text{ coins} = 6$
- **Total Score**: $40 + 21 + 6 =$ **67 points**

---

### Testing Light B: The Monster Highway Crane Light (₱8,000)
- **Piggy Bank Grade**: 1 out of 10! (Way over budget, you can't afford it!)
  - Points: $1 \times 4\text{ coins} = 4$
- **Treehouse Fit Grade**: 2 out of 10! (Way too huge and blinding for a small yard.)
  - Points: $2 \times 3\text{ coins} = 6$
- **Brightness Grade**: 10 out of 10! (Brightest thing on earth!)
  - Points: $10 \times 3\text{ coins} = 30$
- **Total Score**: $4 + 6 + 30 =$ **40 points**

---

### Testing Light C: The Treehouse Solar Luminaire (₱1,500)
- **Piggy Bank Grade**: 9 out of 10! (Fits inside your ₱2,000 budget!)
  - Points: $9 \times 4\text{ coins} = 36$
- **Treehouse Fit Grade**: 10 out of 10! (Perfect size for the wooden rail!)
  - Points: $10 \times 3\text{ coins} = 30$
- **Brightness Grade**: 9 out of 10! (Plenty of clear light for comics!)
  - Points: $9 \times 3\text{ coins} = 27$
- **Total Score**: $36 + 30 + 27 =$ **93 points**

---

## And the Winner Is...

| Solar Light | Total Points | Result |
| :--- | :--- | :--- |
| **Light C (Treehouse Luminaire)** | **93 / 100** | **Winner! Fits everything you need.** |
| **Light A (Pocket Light)** | 67 / 100 | Too dim to read comics. |
| **Light B (Monster Crane Light)** | 40 / 100 | Too expensive and way too blinding. |

Even though Light B had the biggest power number, **Light C won by a landslide** because it balanced everything you actually cared about.

---

## The Secret Rule: Is It in Stock?

There is one last rule. 

What if the shopkeeper says: *"Light C is perfect, but our shelf is completely empty today!"*

The computer says:
> *"Uh oh! We cannot recommend something you cannot buy!"*

In our app, if a product is out of stock, its final score gets cut in half so you only get recommendations for solar lights that are sitting on the store shelf ready to be delivered.

---

## Quick Summary in 3 Sentences

1. **Not all needs are equal**: Staying in budget and fitting your pole might matter more than raw wattage.
2. **Weights are importance coins**: We give more coins to the features that matter most to you.
3. **Multiply and add**: The computer grades each solar light, multiplies by your coins, and recommends the one with the highest total score!
