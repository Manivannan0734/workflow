"use client";
import Link from "next/link";
import { Card, Image } from "semantic-ui-react";
import styles from "../styles/Landing.module.css";
import withAuth from "@/utilsJS/withAuth";
const Landing = () => {
  const boxes = [
    { name: "Users", link: "/User", image: "/assets/user.jpg" },
    { name: "Groups", link: "/Group", image:"/assets/grp.jpg"   },
    { name: "Templates", link: "/Templates", image: "/assets/template.jpg" },
    { name: "Tasks", link: "/TasksList", image: "/assets/task.jpg" },
    { name: "Issues", link: "/Issues", image: "/assets/issue.jpg" },
    { name: "Chats", link: "/Chats", image: "/assets/chat.jpg" },
    { name: "Logs", link: "/Logs", image: "/assets/log.jpg" },
  ];

  return (
    <div className={styles.container}>
      <Card.Group itemsPerRow={3} stackable className={styles.cardGroup}>
        {boxes.map((box) => (
          <Link href={box.link} key={box.name} style={{ textDecoration: "none" }}>
            <Card className={styles.card}>
              <div className={styles.imageWrapper}>
                <Image src={box.image} alt={box.name} className={styles.image} />
              </div>
              <Card.Content>
                <Card.Header textAlign="center">{box.name}</Card.Header>
              </Card.Content>
            </Card>
          </Link>
        ))}
      </Card.Group>
    </div>
  );
};

export default withAuth(Landing);
