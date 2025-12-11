import React from "react";
import { Button, Icon, Header, Segment } from "semantic-ui-react";  
import styles from "../styles/Gerror.module.css";

const Gerror = () => {
  return (
   
    <div className={styles.wrapper}> 
      <Segment padded="very" raised className={styles.segment}>
        <Icon name="exclamation triangle" size="huge" color="red" />
        <Header as="h1" className={styles.header}>
          500 - Internal Server Error
        </Header>
        <p className={styles.message}>
          Oops! Something went wrong on our end. Please try again later.
        </p>
        <Button
          color="blue"
          size="large"
          onClick={() => (window.location.href = "/")}
          animated="fade"
          className={styles.button}
        >
          <Button.Content visible>Go Home</Button.Content>
          <Button.Content hidden>
            <Icon name="home" />
          </Button.Content>
        </Button>
      </Segment>
    </div>
  );
};

export default Gerror;