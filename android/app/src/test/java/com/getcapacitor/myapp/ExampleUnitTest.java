package com.chronicon.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;
public class ExampleUnitTest {

    @Test
    public void mainActivity_isPackagedUnderChroniconApp() {
        assertEquals("com.chronicon.app", MainActivity.class.getPackage().getName());
    }
}
