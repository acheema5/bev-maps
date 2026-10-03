Speaker B: All right. Basically we can edit the text as well.
Speaker A: Yeah.
Speaker B: So I think what we ultimately want to create, this can just be like a conversation. Yeah. What we ultimately want to create is a very clean application. That's simple. Extremely simple.
Speaker A: Right, right. And like, when we're talking about features of what we want Bev Maps to. What I'm really envisioning is you open up the app Bev Maps, and all it says is Find Bev.
Speaker B: Simple as that. And. And it's not in the slightest bit a. AI looking. Generated.
Speaker A: Yeah.
Speaker B: Button. It's. It's very seamlessly integrated. Should we go like Apple Glass morphism?
Speaker A: Oh, that's an amazing idea. Yes, yes. We should, should be white and then like a little gray around the corners and. And it just says Find Bev. And then when you click it, while we're making that API call, it should just be Finding Bev. Finding Bev, like blinking. And then once we actually have the store, we're going to. Then we're going to get into the navigation.
Speaker B: Okay, but how are you thinking this Finding Bev is looking?
Speaker A: I think it spells it out.
Speaker B: It's like, are the dots individually showing like one dot, two dots, three dots?
Speaker A: Yeah. But like, I think even the Finding Bev should be like Finding Bev. Finding Bev.
Speaker B: Oh, oh, you're talking about where the text is like basically white and the gray thing.
Speaker A: Yeah, yeah.
Speaker B: Through it. Yeah, Like a gray streaming through the fine Bev. Yes, yes, very like Apple font or Granola AI font or whisper flow type.
Speaker A: Yeah, yeah, Something clean like that. Very clean. It should be a very clean feel. And then, and then once it finds the Bev, all we want do we want to do ar.
Speaker B: What you think about ar? Yeah. So what we basically want to have happen is that this app has like an Enable camera function. And since it's what we forgot to mention, which is very important is this is a mobile first platform and this is basically exclusively used on mobile phone.
Speaker A: Yes.
Speaker B: But what we're planning on doing is using the feature the app has in Safari where if you search a web page, you can add it to your home screen and it essentially functions as an application when you have it deployed to Vercel and even if you're hosting some back end to store user data. Right. And so we're using that rather than purchasing an Apple developer accounts because that's $99 a year and we really want to put our priorities in capital into the expansion of Bev Maps itself, rather than giving it to Apple.
Speaker A: Exactly that. Anyways, yeah, back to the feature. So once you, once it finds a bev, we want it to be an enable camera. The user pulls out their camera and if they're holding in front of him like it's fucking Pokemon Go. You feel me?
Speaker B: Yeah, exactly like Pokemon Go. And it's, it's literally just like the screen that you would see if you open your camera to take a photo without the like capture button. However, we can have a capture feature in the left hand corner where it takes a photo, but we would probably need to integrate that more with the phone. So we're going to leave that for the second version of this app.
Speaker A: No, no.
Speaker B: Overlaid with that exact imagery that you're getting from your camera is an animated dashed line consisting of maybe between two and four, but probably leaning to three dashes and then an arrow. And this arrow can be pointing forward, it can be pointing left, right. It can be telling the user they need to make a U turn.
Speaker A: It should be all angles, all degrees. It should be accounted for. And all. The user doesn't. Oh yeah,
Speaker B: but the user, the user themselves from the camera lens sees a large arrow that's going straight, left, right or U turn. Yeah, it's, it's four choices, but they, they do have in the upper right hand corner, like in Call of Duty. Oh no, caught his upper left.
Speaker A: I think most of them are upper left.
Speaker B: Okay. In the upper left corner. Scratch upper right. In the upper left left corner. We need a mini, we need a mini map. And this mini map has a circle around the user. This is just like Apple maps according to network connectivity, like how accurate the guess is, as well as the direction that the phone is facing within the map.
Speaker A: And this should only be at a 15 meter radius of the person. So they have to move around the map for them to see the rest of the mini map. Yeah, yeah, yeah.
Speaker B: And the mini map goes from being black and white to the original color of like, you know how Google Maps has trees, tree areas green like city areas, light tan or whatever it is that becomes uncovered. So essentially the dynamics that we would have to code into that would be that the original map the user sees is the dark mode Google Maps. And as they uncover areas, it's like you're shading off portions of that map with the underlayed regular Google Maps or with minimap shmel.
Speaker A: Essentially, once the user discovers a new area, it should get lit up in the, in the map, in the map.
Speaker B: And that's minimal. And it also has like the connectivity radius with an arrow pointing the direction that the user's phone is facing. And by facing, we're talking about you're holding your phone in its vertical normal way straight ahead from where your phone is pointing. That's where the mini map little arrow. Like think of it as like a circle having like the little triangle at the. The very top of the circ. So then that's.
Speaker A: Yeah, great.
Speaker B: Now that is the overarching aesthetic. Let's talk a little bit about the back end infrastructure. That's I feel like in terms of the two responsibilities, that's UI though.
Speaker A: Am I wrong? No. Essentially what we're gonna do is we need to have preloaded. We need to essentially when. When the user clicks find bev, our backend needs to find a bev. Right? So we need to have Google Maps incorporated where we're getting all of the stores, such as, like convenience stores, supermarkets, vending machines, stuff like that. We need to find what bevs are in the nearby radius to the user and what bevs are in a store and a location that's open now. So once we get that list, we then pick the closest store to the user and then that. That is the navigation that will be loaded into our front end.
Speaker B: All right, and are we planning on having it be such that like the users are only on foot? Because, like, the optimal route is not always the shortest path. If you're driving a car, there might be traffic one way. We're assuming they're on foot, right?
Speaker A: Yes, yes. This is all on foot.
Speaker B: Yeah. So that's an important detail.
Speaker A: Wait. Yeah, wait, wait.
Speaker B: Also, this is just like conversation. We all need to make it like.
Speaker A: All right, wait, I think we're good.
Speaker B: No, no, no, no.
Speaker A: All right, wait, what's left? We talked about front end. We talked about back.
Speaker B: So I think another. Tell me if you think this. This should be like added on later. Is the cape. Like. But this would need a full. We would need backend to store this information. But if a user finds something like a vending machine. Like a vending machine is not going to be found in Google Maps. Right? So the user knows where a vending machine is and they scan a vending machine. They get like points in this application. Right. For adding a location.
Speaker A: Oh, ad location.
Speaker B: So like, like bro vending machine is a great example because Those are open 247 and they're only reliant on your access into some area.
Speaker A: Yeah, that's true, but that.
Speaker B: Save that for later.
Speaker A: Yeah, say that for later. I feel you have to talk about that a little bit more because if you're not a resident of like the house, for example, you can't go and get that vending machine.
Speaker B: No, exactly.
Speaker A: So, like, but like, how do you know when what you like, Then you would have to have like full on profiles. Yeah. So I think we should have that later.
Speaker B: Yeah, that's for the next Friday.
Speaker A: No, we have new apps every time. We gotta keep simple. I feel like it should just be like five.
Speaker B: Yeah. All right, so. So in terms of like, what we need Claude to do, we're gonna give it this text file that's like the entire con.
Speaker A: Yeah.
Speaker B: Say like, please understand this entire conversation fully.
Speaker A: Yeah. And
Speaker B: compile it into a Vision MD file.
Speaker A: Yeah.
Speaker B: And then one of us gives it to Claude, says like, create two subfolders. It's what you're working on. What I'm working on.
Speaker A: Yeah.
Speaker B: And then our agents, like plug away at those points and then we have like a combined agent that takes both of our contributions.
Speaker A: Yeah, that'll be at the end.
Speaker B: No, we should have that as we go.
Speaker A: Oh, wait. Just like constantly doing our shit. Yeah.
Speaker B: Create an agent.
Speaker A: All right, done. Yeah.
